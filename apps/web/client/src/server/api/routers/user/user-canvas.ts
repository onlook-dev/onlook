import {
    canvases,
    createDefaultUserCanvas,
    projects,
    toCanvas,
    toFrame,
    userCanvases,
    userCanvasUpdateSchema,
    type UserCanvas
} from '@onlook/db';
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
    update: protectedProcedure.input(
        z.object({
            projectId: z.string(),
            canvasId: z.string(),
            canvas: userCanvasUpdateSchema,
        })).mutation(async ({ ctx, input }) => {
            try {
                await ctx.db
                    .update(userCanvases)
                    .set(input.canvas)
                    .where(
                        and(
                            eq(userCanvases.canvasId, input.canvasId),
                            eq(userCanvases.userId, ctx.user.id),
                        ),
                    );
                await ctx.db.update(projects).set({
                    updatedAt: new Date(),
                }).where(eq(projects.id, input.projectId));
                return true;
            } catch (error) {
                console.error('Error updating user canvas', error);
                return false;
            }
        }),
});
