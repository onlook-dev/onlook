import { trackEvent } from '@/utils/analytics/server';
import { customDomains, customDomainVerification, projectCustomDomains, type CustomDomainVerification } from '@onlook/db';
import { VerificationRequestStatus } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../../trpc';
import { createDomainVerification, ensureUserOwnsDomain, getCustomDomain, getFailureReason, getVerification, verifyFreestyleDomain, verifyFreestyleDomainWithCustomDomain } from './helpers';

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

        trackEvent({
            distinctId: ctx.user.id,
            event: 'user_verified_domain',
            properties: {
                domain: verification.fullDomain,
            }
        })
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

        // TODO: There is a known issue with Freestyle where the domain verification can fail if another verification request was made for the same domain.
        const verifiedDomain = await verifyFreestyleDomainWithCustomDomain(customDomain.apexDomain);
        if (!verifiedDomain) {
            return {
                success: false,
                failureReason: 'Failed to verify domain with Freestyle hosting provider. Please contact support as this is likely an issue with Freestyle.',
            };
        }

        const [projectCustomDomain] = await ctx.db.insert(projectCustomDomains).values({
            projectId: input.projectId,
            fullDomain: input.fullDomain,
            customDomainId: customDomain.id,
        }).returning();

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
