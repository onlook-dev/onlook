import { previewDomains } from '@onlook/db';
import { eq } from 'drizzle-orm';
import type { FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { initializeFreestyleSdk } from './freestyle';

export const previewRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findMany({
            where: eq(previewDomains.projectId, input.projectId),
        });
        return preview;
    }),
    create: protectedProcedure.input(z.object({
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
            const sdk = initializeFreestyleSdk();
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
