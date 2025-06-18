import { customDomains, customDomainVerification, publishedDomains } from '@onlook/db';
import { VerificationRequestStatus } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { initializeFreestyleSdk } from './freestyle';

export const verificationRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const verification = await ctx.db.query.customDomainVerification.findMany({
            where: eq(customDomainVerification.projectId, input.projectId),
        });
        return verification;
    }),
    create: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        // Create if not exists
        let customDomain = (await ctx.db.insert(customDomains).values({
            apexDomain: input.domain,
        }).onConflictDoNothing().returning())[0];
        
        // If domain already exists, find it
        if (!customDomain) {
            customDomain = await ctx.db.query.customDomains.findFirst({
                where: eq(customDomains.apexDomain, input.domain),
            });
            if (!customDomain) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create or find domain',
                });
            }
        }

        // Check if verification request already exists
        const verification = await ctx.db.query.customDomainVerification.findFirst({
            where: and(eq(customDomainVerification.domainId, customDomain.id), eq(customDomainVerification.projectId, input.projectId)),
        });
        if (verification) {
            return verification;
        }

        const sdk = initializeFreestyleSdk();
        const res = await sdk.createDomainVerificationRequest(input.domain);
        await ctx.db.insert(customDomainVerification).values({
            domainId: customDomain.id,
            projectId: input.projectId,
            verificationId: res.id,
            verificationCode: res.verificationCode,
        });
        return res;
    }),
    verify: protectedProcedure.input(z.object({
        verificationId: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const verification = await ctx.db.query.customDomainVerification.findFirst({
            where: and(eq(customDomainVerification.verificationId, input.verificationId), eq(customDomainVerification.projectId, input.projectId)),
        });
        if (!verification) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Verification request not found',
            });
        }

        if (verification.status === VerificationRequestStatus.USED) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Domain already verified',
            });
        }

        if (verification.status === VerificationRequestStatus.EXPIRED) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Verification request expired',
            });
        }

        const sdk = initializeFreestyleSdk();
        const res: {
            domain?: string;
            message?: string;
        } = await sdk.verifyDomainVerificationRequest(input.verificationId);
        if (res.message) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: res.message,
            });
        }

        const domain = res.domain;

        if (!domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Domain not found',
            });
        }

        await ctx.db
            .transaction(
                async (tx) => {
                    await tx.update(customDomains).set({
                        verified: true,
                    }).where(eq(customDomains.id, verification.domainId));

                    await tx.insert(publishedDomains).values({
                        projectId: verification.projectId,
                        fullDomain: domain,
                        domainId: verification.domainId,
                    });
                },
            );
        return res;
    }),
});