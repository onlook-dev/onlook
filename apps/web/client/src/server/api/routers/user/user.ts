import { createDefaultUserSettings, toUserSettings, userInsertSchema, users, userSettings, userSettingsUpdateSchema } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const userSettingsRoute = createTRPCRouter({
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

export const userRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const authUser = ctx.user;
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, authUser.id),
        });
        return user;
    }),
    getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, input),
            with: {
                userProjects: {
                    with: {
                        project: true,
                    },
                },
            },
        });
        return user;
    }),
    create: protectedProcedure.input(userInsertSchema).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.insert(users).values(input).returning({ id: users.id });
        if (!user[0]) {
            throw new Error('Failed to create user');
        }
        return user[0];
    }),
    settings: userSettingsRoute,
});
