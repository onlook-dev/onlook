import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { eq } from 'drizzle-orm';
import {
    projectSettings,
    projectSettingsInsertSchema,
    projectSettingsUpdateSchema,
    toProjectSettings,
} from '@onlook/db';
import { TRPCError } from '@trpc/server';

export const settingRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const setting = await ctx.db.query.projectSettings.findFirst({
                where: eq(projectSettings.projectId, input.projectId),
            });
            if (!setting) {
                return null;
            }
            return toProjectSettings(setting);
        }),
    update: protectedProcedure
        .input(projectSettingsUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            if (!input.projectId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Project ID is required',
                });
            }
            await ctx.db
                .update(projectSettings)
                .set(input)
                .where(eq(projectSettings.projectId, input.projectId));
            return true;
        }),
    create: protectedProcedure
        .input(projectSettingsInsertSchema)
        .mutation(async ({ ctx, input }) => {
            await ctx.db.insert(projectSettings).values(input);
            return true;
        }),
    delete: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(projectSettings)
                .where(eq(projectSettings.projectId, input.projectId));
            return true;
        }),
});
