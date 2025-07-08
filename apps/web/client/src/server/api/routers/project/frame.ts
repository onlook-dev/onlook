import { frameInsertSchema, frames, frameUpdateSchema, toFrame } from '@onlook/db';
import { FrameType } from '@onlook/models';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const frameRouter = createTRPCRouter({
    get: protectedProcedure
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
    getByCanvas: protectedProcedure
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
    create: protectedProcedure.input(frameInsertSchema).mutation(async ({ ctx, input }) => {
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
    update: protectedProcedure.input(z.object({
        frameId: z.string(),
        frame: frameUpdateSchema,
    })).mutation(async ({ ctx, input }) => {
        try {
            await ctx.db.update(frames).set({
                ...input.frame,
                type: input.frame.type as FrameType,
            }).where(eq(frames.id, input.frameId));
            return true;
        } catch (error) {
            console.error('Error updating frame', error);
            return false;
        }
    }),
    delete: protectedProcedure
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
