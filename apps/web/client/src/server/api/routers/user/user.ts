import { createDefaultUserSettings, toUser, toUserSettings, userInsertSchema, users, userSettings, userSettingsUpdateSchema } from '@onlook/db';

import { callUserWebhook } from '@/utils/n8n/webhook';
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
        const userData = user ? toUser({
            id: user.id,
            name: user.name ?? authUser.user_metadata.name,
            email: user.email ?? authUser.email,
            avatarUrl: user.avatarUrl ?? authUser.user_metadata.avatarUrl,
            createdAt: user.createdAt ?? new Date(authUser.created_at ?? Date.now()),
            updatedAt: user.updatedAt ?? new Date(authUser.updated_at ?? Date.now()),
        }) : null;
        return userData;
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
        const [user] = await ctx.db.insert(users).values(input).returning();
        if (!user) {
            throw new Error('Failed to create user');
        }
        await callUserWebhook({
            email: user.email,
            firstName: user.name ?? '',
            lastName: '',
            source: 'web beta',
            subscribed: false,
        });
        return user;
    }),
    upsert: protectedProcedure
        .input(userInsertSchema)
        .mutation(async ({ ctx, input }) => {
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, input.id),
            });
            if (existingUser) {
                const [user] = await ctx.db.update(users).set(input).where(eq(users.id, input.id)).returning();
                if (!user) {
                    throw new Error('Failed to update user');
                }
                return user;
            } else {
                const [user] = await ctx.db.insert(users).values(input).returning();
                if (!user) {
                    throw new Error('Failed to create user');
                }
                await callUserWebhook({
                    email: user.email,
                    firstName: user.name ?? '',
                    lastName: '',
                    source: 'web beta',
                    subscribed: false,
                });
                return user;
            }
        }),
    settings: userSettingsRoute,
});
