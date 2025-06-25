import { canvases, toCanvas, userCanvases, userCanvasUpdateSchema } from '@onlook/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const userCanvasRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const userCanvas = await ctx.db.query.userCanvases.findFirst({
                where: and(
                    eq(canvases.projectId, input.projectId),
                    eq(userCanvases.userId, ctx.user.id),
                ),
                with: {
                    canvas: true,
                },
            });

            if (!userCanvas) {
                throw new Error('User canvas not found');
            }
            return toCanvas(userCanvas);
        }),
    update: protectedProcedure.input(userCanvasUpdateSchema).mutation(async ({ ctx, input }) => {
        try {
            if (!input.canvasId) {
                throw new Error('Canvas ID is required');
            }
            await ctx.db
                .update(userCanvases)
                .set(input)
                .where(
                    and(
                        eq(userCanvases.canvasId, input.canvasId),
                        eq(userCanvases.userId, ctx.user.id),
                    ),
                );
            return true;
        } catch (error) {
            console.error('Error updating user canvas', error);
            return false;
        }
    }),
});
