import { CodeSandbox } from '@codesandbox/sdk';
import { shortenUuid } from '@onlook/utility';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const sdk = new CodeSandbox(process.env.CSB_API_KEY!);

export const sandboxRouter = createTRPCRouter({
    start: publicProcedure.input(z.object({
        sandboxId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const startData = await sdk.sandboxes.resume(input.sandboxId);
        const session = await startData.createBrowserSession({
            id: shortenUuid(input.userId, 20)
        });
        return session;
    }),

    hibernate: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.hibernate(input.sandboxId);
    }),

    list: publicProcedure.query(async () => {
        const listResponse = await sdk.sandboxes.list();
        return listResponse;
    }),

    fork: publicProcedure.input(z.object({
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

    delete: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.shutdown(input.sandboxId);
    }),
});
