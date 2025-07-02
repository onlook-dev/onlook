import {
    canvases, canvasUpdateSchema,
    createDefaultUserCanvas, toCanvas, toFrame, userCanvases,
    type UserCanvas
} from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const canvasRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbCanvas = await ctx.db.query.canvases.findFirst({
                where: eq(canvases.projectId, input.projectId),
            });
            if (!dbCanvas) {
                return null;
            }
            return dbCanvas;
        }),
    getWithFrames: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbCanvas = await ctx.db.query.canvases.findFirst({
                where: eq(canvases.projectId, input.projectId),
                with: {
                    frames: true,
                    userCanvases: {
                        where: eq(userCanvases.userId, ctx.user.id),
                    },
                },
            });
            if (!dbCanvas) {
                return null;
            }
            const userCanvas: UserCanvas = dbCanvas.userCanvases[0] ?? createDefaultUserCanvas(ctx.user.id, dbCanvas.id);
            return {
                userCanvas: toCanvas(userCanvas),
                frames: dbCanvas.frames.map(toFrame),
            };
        }),

    update: protectedProcedure.input(canvasUpdateSchema).mutation(async ({ ctx, input }) => {
        try {
            if (!input.id) {
                throw new Error('Canvas ID is required');
            }
            await ctx.db.update(canvases).set(input).where(eq(canvases.id, input.id));
            return true;
        } catch (error) {
            console.error('Error updating canvas', error);
            return false;
        }
    }),
});
