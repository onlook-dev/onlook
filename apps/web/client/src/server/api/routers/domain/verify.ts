import { FREESTYLE_IP_ADDRESS, FRESTYLE_CUSTOM_HOSTNAME } from '@onlook/constants';
import { customDomains, customDomainVerification, projectCustomDomains, userProjects, type CustomDomain, type CustomDomainVerification } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import { VerificationRequestStatus, type AVerificationRecord } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { promises as dns } from 'dns';
import { and, eq, or } from 'drizzle-orm';
import { type HandleVerifyDomainError, type HandleVerifyDomainResponse } from 'freestyle-sandboxes';
import { parse } from 'psl';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { initializeFreestyleSdk } from './freestyle';

export const verificationRouter = createTRPCRouter({
    getActive: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }): Promise<CustomDomainVerification | null> => {
        const verification = await ctx.db.query.customDomainVerification.findFirst({
            where: and(
                eq(customDomainVerification.projectId, input.projectId),
                or(
                    eq(customDomainVerification.status, VerificationRequestStatus.PENDING),
                    eq(customDomainVerification.status, VerificationRequestStatus.VERIFIED),
                ),
            ),
            with: {
                customDomain: true,
            },
        });
        return verification ?? null;
    }),
    create: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }): Promise<CustomDomainVerification> => {
        const { customDomain, subdomain } = await getCustomDomain(ctx.db, input.domain);
        const existingVerification = await getVerification(ctx.db, input.projectId, customDomain.id);
        if (existingVerification) {
            return existingVerification;
        }
        const verification = await createDomainVerification(ctx.db, input.domain, input.projectId, customDomain.id, subdomain);
        return verification;
    }),
    remove: protectedProcedure.input(z.object({
        verificationId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.update(customDomainVerification).set({
            status: VerificationRequestStatus.CANCELLED,
            updatedAt: new Date(),
        }).where(eq(customDomainVerification.id, input.verificationId));
    }),
    verify: protectedProcedure.input(z.object({
        verificationId: z.string(),
    })).mutation(async ({ ctx, input }): Promise<{
        success: boolean;
        failureReason: string | null;
    }> => {
        const verification = await ctx.db.query.customDomainVerification.findFirst({
            where: and(
                eq(customDomainVerification.id, input.verificationId),
                eq(customDomainVerification.status, VerificationRequestStatus.PENDING),
            ),
        });
        if (!verification) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Verification request not found',
            });
        }
        const domain = await verifyFreestyleDomain(verification.freestyleVerificationId);

        if (!domain) {
            const failureReason = await getFailureReason(verification);
            return {
                success: false,
                failureReason,
            };
        }

        await ctx.db
            .transaction(
                async (tx) => {
                    await tx.update(customDomains).set({
                        verified: true,
                    }).where(eq(customDomains.id, verification.customDomainId));

                    await tx.insert(projectCustomDomains).values({
                        projectId: verification.projectId,
                        fullDomain: domain,
                        customDomainId: verification.customDomainId,
                    });

                    await tx.update(customDomainVerification).set({
                        status: VerificationRequestStatus.VERIFIED,
                    }).where(eq(customDomainVerification.id, verification.id));
                },
            );
        return {
            success: true,
            failureReason: null,
        };
    }),
    verifyOwnedDomain: protectedProcedure.input(z.object({
        fullDomain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }): Promise<{
        success: boolean;
        failureReason: string | null;
    }> => {
        const user = ctx.user;
        if (!user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Unauthorized',
            });
        }
        const ownsDomain = await ensureUserOwnsDomain(ctx.db, user.id, input.fullDomain);
        if (!ownsDomain) {
            return {
                success: false,
                failureReason: 'User does not own domain',
            };
        }
        const { customDomain, subdomain } = await getCustomDomain(ctx.db, input.fullDomain);
        const verifiedDomain = await verifyFreestyleDomainWithCustomDomain(customDomain.apexDomain);
        if (!verifiedDomain) {
            return {
                success: false,
                failureReason: 'Failed to verify domain with Freestyle hosting provider. Please contact support as this is likely an issue with Freestyle.',
            };
        }
        const [projectCustomDomain] = await ctx.db.insert(projectCustomDomains).values({
            projectId: input.projectId,
            fullDomain: verifiedDomain,
            customDomainId: customDomain.id,
        });
        if (!projectCustomDomain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create project custom domain',
            });
        }
        return {
            success: true,
            failureReason: null,
        };
    }),
});

const ensureUserOwnsDomain = async (db: DrizzleDb, userId: string, domain: string): Promise<boolean> => {
    const foundUserProjects = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, userId),
        with: {
            project: {
                with: {
                    projectCustomDomains: true,
                },
            }
        },
    });

    const ownedDomains = foundUserProjects.flatMap(
        userProject => userProject.project.projectCustomDomains.map(domain => domain.fullDomain),
    );
    return ownedDomains.includes(domain);
};

async function getCustomDomain(db: DrizzleDb, domain: string): Promise<{ customDomain: CustomDomain, subdomain: string | null }> {
    const parsedDomain = parse(domain);
    if (parsedDomain.error) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid domain: ${parsedDomain.error.message}`,
        });
    }

    if (!parsedDomain.domain) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Could not resolve apex domain',
        });
    }

    const apexDomain = parsedDomain.domain;
    const subdomain = parsedDomain.subdomain;

    const [customDomain] = await db
        .insert(customDomains)
        .values({
            apexDomain,
        })
        .onConflictDoUpdate({
            target: customDomains.apexDomain,
            set: {
                updatedAt: new Date(),
            },
        })
        .returning();

    if (!customDomain) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create or update domain',
        });
    }

    return { customDomain, subdomain };
}

async function getVerification(db: DrizzleDb, projectId: string, customDomainId: string) {
    const verification = await db.query.customDomainVerification.findFirst({
        where: and(
            eq(customDomainVerification.customDomainId, customDomainId),
            eq(customDomainVerification.projectId, projectId),
            eq(customDomainVerification.status, VerificationRequestStatus.PENDING),
        ),
    });
    return verification;
}

async function createDomainVerification(db: DrizzleDb, domain: string, projectId: string, customDomainId: string, subdomain: string | null): Promise<CustomDomainVerification> {
    const sdk = initializeFreestyleSdk();
    const { id: freestyleVerificationId, verificationCode } = await sdk.createDomainVerificationRequest(domain);
    const [verification] = await db.insert(customDomainVerification).values({
        customDomainId,
        fullDomain: domain,
        projectId,
        freestyleVerificationId,
        txtRecord: {
            type: 'TXT',
            name: FRESTYLE_CUSTOM_HOSTNAME,
            value: verificationCode,
            verified: false,
        },
        aRecords: getARecords(subdomain),
    }).returning();
    if (!verification) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create domain verification',
        });
    }
    return verification;
}

function getARecords(subdomain: string | null): AVerificationRecord[] {
    if (!subdomain) {
        return [{
            type: 'A',
            name: '@',
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        }, {
            type: 'A',
            name: 'www',
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        }];
    }

    return [
        {
            type: 'A',
            name: subdomain,
            value: FREESTYLE_IP_ADDRESS,
            verified: false,
        },
    ];
}

const verifyFreestyleDomain = async (verificationId: string): Promise<string | null> => {
    try {
        const sdk = initializeFreestyleSdk();
        const res: HandleVerifyDomainResponse = await sdk.verifyDomainVerificationRequest(verificationId);
        if (!res.domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to verify domain',
            });
        }

        const domain = res.domain;

        if (!domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Domain not found',
            });
        }

        return domain;
    } catch (error) {
        console.error(error);
        return null;
    }
}

const verifyFreestyleDomainWithCustomDomain = async (domain: string): Promise<string | null> => {
    try {
        const sdk = initializeFreestyleSdk();
        const res = await sdk.verifyDomain(domain) as HandleVerifyDomainResponse & HandleVerifyDomainError & { domain: string | null, message: string | null };
        if (!res.domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: res.message ?? 'Failed to verify domain',
            });
        }

        const verifiedDomain = res.domain;
        if (!verifiedDomain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Domain not found',
            });
        }

        return verifiedDomain;
    } catch (error) {
        console.error(error);
        return null;
    }
}

const getFailureReason = async (verification: CustomDomainVerification): Promise<string> => {
    const errors: string[] = [];
    const txtRecord = verification.txtRecord;
    const txtRecordResponse = await isTxtRecordPresent(verification.fullDomain, txtRecord.name, txtRecord.value);

    if (!txtRecordResponse.isPresent) {
        let txtError = `TXT Record Missing:\n`;
        txtError += `    Expected:\n`;
        txtError += `        host: ${txtRecord.name}\n`;
        txtError += `        value: "${txtRecord.value}"\n`;
        if (txtRecordResponse.foundRecords.length > 0) {
            txtError += `    Found:\n`;
            txtError += `        value: ${txtRecordResponse.foundRecords.map(record => `"${record}"`).join(', ')}`;
        } else {
            txtError += `    Found: No TXT records`;
        }
        errors.push(txtError);
    }

    const aRecords = verification.aRecords;
    for (const aRecord of aRecords) {
        const aRecordResponse = await isARecordPresent(verification.fullDomain, aRecord.value);
        if (!aRecordResponse.isPresent) {
            let aError = `A Record Missing:\n`;
            aError += `    Expected:\n`;
            aError += `        host: ${aRecord.name}\n`;
            aError += `        value: ${aRecord.value}\n`;
            if (aRecordResponse.foundRecords.length > 0) {
                aError += `    Found:\n`;
                aError += `        value: ${aRecordResponse.foundRecords.join(', ')}`;
            } else {
                aError += `    Found: No A records`;
            }
            errors.push(aError);
        }
    }

    errors.push('DNS records may take up to 24 hours to update');
    return errors.join('\n\n');
};

export async function isTxtRecordPresent(fullDomain: string, name: string, expectedValue: string): Promise<{
    isPresent: boolean;
    foundRecords: string[];
}> {
    try {
        const parsedDomain = parse(fullDomain);
        if (parsedDomain.error) {
            return {
                isPresent: false,
                foundRecords: [],
            };
        }

        const domain = parsedDomain.domain ?? fullDomain;
        const records = await dns.resolveTxt(`${name}.${domain}`);
        const foundRecords = records.map(entry => entry.join(''));
        return {
            isPresent: foundRecords.includes(expectedValue),
            foundRecords,
        };
    } catch {
        return {
            isPresent: false,
            foundRecords: [],
        };
    }
}

export async function isARecordPresent(name: string, expectedIp: string): Promise<{
    isPresent: boolean;
    foundRecords: string[];
}> {
    try {
        const records = await dns.resolve4(name);
        return {
            isPresent: records.includes(expectedIp),
            foundRecords: records,
        };
    } catch {
        return {
            isPresent: false,
            foundRecords: [],
        };
    }
}

