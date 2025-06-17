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
    upsert: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                settings: projectSettingsInsertSchema,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [updatedSettings] = await ctx.db
                .insert(projectSettings)
                .values(input)
                .onConflictDoUpdate({
                    target: [projectSettings.projectId],
                    set: input.settings,
                })
                .returning();
            if (!updatedSettings) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update project settings',
                });
            }
            return toProjectSettings(updatedSettings);
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
