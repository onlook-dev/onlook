import { createDefaultUserSettings, toUserSettings, userSettings, userSettingsUpdateSchema } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const userSettingsRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const settings = await ctx.db.query.userSettings.findFirst({
            where: eq(userSettings.userId, user.id),
        });
        return toUserSettings(settings ?? createDefaultUserSettings(user.id));
    }),
    upsert: protectedProcedure.input(userSettingsUpdateSchema).mutation(async ({ ctx, input }) => {
        const user = ctx.user

        const existingSettings = await ctx.db.query.userSettings.findFirst({
            where: eq(userSettings.userId, user.id),
        });

        if (!existingSettings) {
            const newSettings = { ...createDefaultUserSettings(user.id), ...input };
            const [insertedSettings] = await ctx.db.insert(userSettings).values(newSettings).returning();
            return toUserSettings(insertedSettings ?? newSettings);
        }
        const [updatedSettings] = await ctx.db.update(userSettings).set(input).where(eq(userSettings.userId, user.id)).returning();

        if (!updatedSettings) {
            throw new Error('Failed to update user settings');
        }

        return toUserSettings(updatedSettings);
    }),
});
