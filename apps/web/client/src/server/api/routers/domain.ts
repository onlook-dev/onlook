import { env } from '@/env';
import { customDomains, customDomainVerification, previewDomains, publishedDomains } from '@onlook/db';
import { VerificationRequestStatus } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const initializeSdk = () => {
    if (!env.FREESTYLE_API_KEY) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'FREESTYLE_API_KEY is not configured. Please set the environment variable to use domain publishing features.',
        });
    }
    return new FreestyleSandboxes({
        apiKey: env.FREESTYLE_API_KEY
    });
};

export const domainRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findMany({
            where: eq(previewDomains.projectId, input.projectId),
        });
        const published = await ctx.db.query.publishedDomains.findMany({
            where: eq(publishedDomains.projectId, input.projectId),
        });

        return {
            preview,
            published,
        }
    }),
    createPreviewDomain: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.insert(previewDomains).values({
            fullDomain: input.domain,
            projectId: input.projectId,
        });
        return {
            domain: input.domain,
        }
    }),
    createVerificationRequest: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        // Create if not exists
        const [customDomain] = await ctx.db.insert(customDomains).values({
            apexDomain: input.domain,
        }).onConflictDoNothing().returning();
        if (!customDomain) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Domain already exists',
            });
        }

        // Check if verification request already exists
        const verification = await ctx.db.query.customDomainVerification.findFirst({
            where: and(eq(customDomainVerification.domainId, input.domain), eq(customDomainVerification.projectId, input.projectId)),
        });
        if (verification) {
            return verification;
        }

        const sdk = initializeSdk();
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

        const sdk = initializeSdk();
        const res: {
            domain?: string;
            message?: string;
        } = await sdk.verifyDomainVerificationRequest(input.verificationId);
        if (res.message || !res.domain) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: res.message,
            });
        }
        await ctx.db
            .transaction(
                async (tx) => {
                    await tx.update(customDomains).set({
                        verified: true,
                    }).where(eq(customDomains.id, verification.domainId));

                    await tx.insert(publishedDomains).values({
                        domainId: verification.domainId,
                        projectId: verification.projectId,
                    });
                },
            );
        return res;
    }),
    publish: protectedProcedure
        .input(
            z.object({
                files: z.record(z.string(), z.object({
                    content: z.string(),
                    encoding: z.string().optional(),
                })),
                config: z.object({
                    domains: z.array(z.string()),
                    entrypoint: z.string().optional(),
                    envVars: z.record(z.string(), z.string()).optional(),
                }),
            }),
        )
        .mutation(async ({ input }) => {
            const sdk = initializeSdk();
            const res = await sdk.deployWeb(
                {
                    files: input.files,
                    kind: 'files',
                },
                input.config,
            );
            const freestyleResponse = (await res) as {
                message?: string;
                error?: {
                    message: string;
                };
                data?: FreestyleDeployWebSuccessResponseV2;
            };
            if (!res) {
                throw new Error(freestyleResponse.error?.message || freestyleResponse.message || 'Unknown error');
            }
            return freestyleResponse.data?.deploymentId ?? '';
        }),
});
