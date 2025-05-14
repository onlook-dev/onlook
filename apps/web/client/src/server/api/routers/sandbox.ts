import { create, hibernate, list, start } from '@/utils/codesandbox/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const sandboxRouter = createTRPCRouter({
    start: publicProcedure.input(z.string()).mutation(async ({ input }) => {
        return await start(input);
    }),
    // Same as start - Separate endpoint for different state management
    reconnect: publicProcedure.input(z.string()).mutation(async ({ input }) => {
        return await start(input);
    }),
    hibernate: publicProcedure.input(z.string()).mutation(async ({ input }) => {
        return await hibernate(input);
    }),
    list: publicProcedure.query(async () => {
        return await list();
    }),
    fork: publicProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const sandbox = await create(input.sandboxId);
        return sandbox;
    }),
});
