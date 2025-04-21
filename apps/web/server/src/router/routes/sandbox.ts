import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const sandboxRouter = router({
    status: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            includeDetails: z.boolean().optional(),
        }))
        .query(({ input }) => {
            return {
                id: input.sandboxId,
                status: 'running',
                details: input.includeDetails ? { cpu: '5%', memory: '120MB' } : undefined,
                uptime: 1200,
            };
        }),

    start: publicProcedure
        .input(z.object({
            projectId: z.string(),
        }))
        .mutation(({ input }) => {
            return `hi ${input.projectId}`;
        }),

    stop: publicProcedure
        .input(z.object({
            sandboxId: z.string(),
            force: z.boolean().optional(),
        }))
        .mutation(({ input }) => {
            return {
                success: true,
                message: `Sandbox ${input.sandboxId} stopped${input.force ? ' forcefully' : ''}`,
                timestamp: new Date().toISOString(),
            };
        }),
});
