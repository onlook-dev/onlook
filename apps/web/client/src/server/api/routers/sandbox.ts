import { CodeSandbox } from '@codesandbox/sdk';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const sdk = new CodeSandbox(process.env.CSB_API_KEY!);

export const sandboxRouter = createTRPCRouter({
    start: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const startData = await sdk.sandbox.start(input.sandboxId);
        return startData;
    }),
    // Same as start - Separate endpoint for different state management
    reconnect: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const startData = await sdk.sandbox.start(input.sandboxId);
        return startData;
    }),
    hibernate: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandbox.hibernate(input.sandboxId);
    }),
    list: publicProcedure.query(async () => {
        const listResponse = await sdk.sandbox.list();
        return listResponse;
    }),
    fork: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const sandbox = await sdk.sandbox.create({ template: input.sandboxId });
        return {
            sandboxId: sandbox.id,
            previewUrl: `https://${sandbox.id}-8084.csb.app`,
        };
    }),
    delete: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandbox.shutdown(input.sandboxId);
    }),
});
