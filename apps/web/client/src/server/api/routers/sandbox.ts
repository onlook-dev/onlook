import { env } from '@/env';
import { CodeSandbox } from '@codesandbox/sdk';
import { shortenUuid } from '@onlook/utility/src/id';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const sdk = new CodeSandbox(env.CSB_API_KEY);

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure.input(z.object({
        sandboxId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const startData = await sdk.sandboxes.resume(input.sandboxId);
        const session = await startData.createBrowserSession({
            id: shortenUuid(input.userId, 20)
        });
        return session;
    }),
    hibernate: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.hibernate(input.sandboxId);
    }),
    list: protectedProcedure.query(async () => {
        const listResponse = await sdk.sandboxes.list();
        return listResponse;
    }),
    fork: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const sandbox = await sdk.sandboxes.create({
            source: 'template',
            id: input.sandboxId,
        });
        return {
            sandboxId: sandbox.id,
            previewUrl: `https://${sandbox.id}-8084.csb.app`,
        };
    }),
    uploadProject: protectedProcedure.input(z.object({
        files: z.record(z.object({
            content: z.string(),
            isBinary: z.boolean().optional(),
        })),
        dependencies: z.record(z.string()).optional(),
        devDependencies: z.record(z.string()).optional(),
        projectName: z.string().optional(),
    })).mutation(async ({ input }) => {
        try {
            // First create a sandbox from a Next.js template
            const templateSandbox = await sdk.sandboxes.create({
                source: 'template',
                id: 'nextjs',
            });

            // 1. Start the sandbox to get a session
            // 2. Use the session's filesystem API to upload files
            // 3. This would require the sandbox to be running
            
            // For now, return the template sandbox as a starting point
            return {
                sandboxId: templateSandbox.id,
                previewUrl: `https://${templateSandbox.id}-8084.csb.app`,
            };
        } catch (error) {
            console.error('Error creating project sandbox:', error);
            throw new Error('Failed to create project sandbox');
        }
    }),
    delete: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.shutdown(input.sandboxId);
    }),
});
