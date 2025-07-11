import { FREESTYLE_IP_ADDRESS, FRESTYLE_CUSTOM_HOSTNAME } from '@onlook/constants';
import { customDomains, customDomainVerification, type CustomDomain, type CustomDomainVerification } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import { VerificationRequestStatus, type AVerificationRecord } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq, or } from 'drizzle-orm';
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
    // verify: protectedProcedure.input(z.object({
    //     verificationId: z.string(),
    //     projectId: z.string(),
    // })).mutation(async ({ ctx, input }) => {
    //     const verification = await ctx.db.query.customDomainVerification.findFirst({
    //         where: and(eq(customDomainVerification.freestyleVerificationId, input.verificationId), eq(customDomainVerification.projectId, input.projectId)),
    //     });
    //     if (!verification) {
    //         throw new TRPCError({
    //             code: 'NOT_FOUND',
    //             message: 'Verification request not found',
    //         });
    //     }

    //     if (verification.status === VerificationRequestStatus.USED) {
    //         throw new TRPCError({
    //             code: 'BAD_REQUEST',
    //             message: 'Domain already verified',
    //         });
    //     }

    //     if (verification.status === VerificationRequestStatus.EXPIRED) {
    //         throw new TRPCError({
    //             code: 'BAD_REQUEST',
    //             message: 'Verification request expired',
    //         });
    //     }

    //     const sdk = initializeFreestyleSdk();
    //     const res: {
    //         domain?: string;
    //         message?: string;
    //     } = await sdk.verifyDomainVerificationRequest(input.verificationId);
    //     if (res.message) {
    //         throw new TRPCError({
    //             code: 'INTERNAL_SERVER_ERROR',
    //             message: res.message,
    //         });
    //     }

    //     const domain = res.domain;

    //     if (!domain) {
    //         throw new TRPCError({
    //             code: 'INTERNAL_SERVER_ERROR',
    //             message: 'Domain not found',
    //         });
    //     }

    //     await ctx.db
    //         .transaction(
    //             async (tx) => {
    //                 await tx.update(customDomains).set({
    //                     verified: true,
    //                 }).where(eq(customDomains.id, verification.domainId));

    //                 await tx.insert(projectCustomDomains).values({
    //                     projectId: verification.projectId,
    //                     fullDomain: domain,
    //                     domainId: verification.domainId,
    //                 });
    //             },
    //         );
    //     return res;
    // }),
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