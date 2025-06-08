import { env } from '@/env';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

// Check if FREESTYLE_API_KEY is available before initializing SDK
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
