import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const sandboxRouter = router({
    create: publicProcedure
        .input(z.string())
        .mutation(({ input }) => {
            return `hi ${input}`;
        }),

    start: publicProcedure
        .input(z.string())
        .mutation(({ input }) => {
            return `hi ${input}`;
        }),

    stop: publicProcedure
        .input(z.string())
        .mutation(({ input }) => {
            return {
                success: true,
                message: `Sandbox ${input} stopped`,
                timestamp: new Date().toISOString(),
            };
        }),

    status: publicProcedure
        .input(z.string())
        .query(({ input }) => {
            return {
                id: input,
                status: 'running',
                details: { cpu: '5%', memory: '120MB' },
                uptime: 1200,
            };
        }),

});
