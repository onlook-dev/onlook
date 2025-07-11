import { FREESTYLE_IP_ADDRESS, FRESTYLE_CUSTOM_HOSTNAME } from '@onlook/constants';
import { customDomains, customDomainVerification, projectCustomDomains, type CustomDomain, type CustomDomainVerification } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import { VerificationRequestStatus, type AVerificationRecord } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { promises as dns } from 'dns';
import { and, eq, or } from 'drizzle-orm';
import type { HandleVerifyDomainResponse } from 'freestyle-sandboxes';
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
                    }).where(eq(customDomains.id, verification.domainId));

                    await tx.insert(projectCustomDomains).values({
                        projectId: verification.projectId,
                        fullDomain: domain,
                        domainId: verification.domainId,
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
});

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
            eq(customDomainVerification.domainId, customDomainId),
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
        domainId: customDomainId,
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

const getFailureReason = async (verification: CustomDomainVerification): Promise<string> => {
    const errors: string[] = [];
    const txtRecord = verification.txtRecord;
    const txtRecordResponse = await isTxtRecordPresent(txtRecord.name, txtRecord.value);

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
        const aRecordResponse = await isARecordPresent(aRecord.name, aRecord.value);
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

    return errors.join('\n\n');
};

export async function isTxtRecordPresent(name: string, expectedValue: string): Promise<{
    isPresent: boolean;
    foundRecords: string[];
}> {
    try {
        const records = await dns.resolveTxt(name);
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

