import { createDefaultUserSettings, toUserSettings, userInsertSchema, users, userSettings, userSettingsInsertSchema } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const userSettingsRoute = createTRPCRouter({
    get: protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
        const settings = await ctx.db.query.userSettings.findFirst({
            where: eq(userSettings.userId, input.userId),
        });
        return toUserSettings(settings ?? createDefaultUserSettings(input.userId));
    }),
    upsert: protectedProcedure.input(z.object({
        userId: z.string(),
        settings: userSettingsInsertSchema,
    })).mutation(async ({ ctx, input }) => {
        if (!input.userId) {
            throw new Error('User ID is required');
        }

        const [updatedSettings] = await ctx.db
            .insert(userSettings)
            .values({
                ...input.settings,
                userId: input.userId,
            })
            .onConflictDoUpdate({
                target: [userSettings.userId],
                set: input.settings,
            })
            .returning();

        if (!updatedSettings) {
            throw new Error('Failed to update user settings');
        }

        return toUserSettings(updatedSettings);
    }),
});

export const userRouter = createTRPCRouter({
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
