import { createTRPCRouter, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { frameInsertSchema, frames, frameUpdateSchema, toFrame } from '@onlook/db';
import { FrameType } from '@onlook/models';

export const frameRouter = createTRPCRouter({
    getFrame: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbFrame = await ctx.db.query.frames.findFirst({
                where: eq(frames.id, input.frameId),
            });
            if (!dbFrame) {
                return null;
            }
            return toFrame(dbFrame);
        }),

    getFrames: protectedProcedure
        .input(
            z.object({
                canvasId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbFrames = await ctx.db.query.frames.findMany({
                where: eq(frames.canvasId, input.canvasId),
                orderBy: (frames, { asc }) => [asc(frames.x), asc(frames.y)],
            });
            return dbFrames.map((frame) => toFrame(frame));
        }),
    createFrame: protectedProcedure.input(frameInsertSchema).mutation(async ({ ctx, input }) => {
        try {
            const normalizedInput = {
                ...input,
                type: input.type as FrameType,
            };
            await ctx.db.insert(frames).values(normalizedInput);
            return true;
        } catch (error) {
            console.error('Error creating frame', error);
            return false;
        }
    }),
    updateFrame: protectedProcedure.input(frameUpdateSchema).mutation(async ({ ctx, input }) => {
        try {
            if (!input.id) {
                throw new Error('Frame ID is required');
            }
            const normalizedInput = {
                ...input,
                type: input.type as FrameType,
            };
            await ctx.db.update(frames).set(normalizedInput).where(eq(frames.id, input.id));
            return true;
        } catch (error) {
            console.error('Error updating frame', error);
            return false;
        }
    }),
    deleteFrame: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.delete(frames).where(eq(frames.id, input.frameId));
                return true;
            } catch (error) {
                console.error('Error deleting frame', error);
                return false;
            }
        }),
});
