import { callUserWebhook } from '@/utils/n8n/webhook';
import { toUser, userInsertSchema, users, type User } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { userSettingsRouter } from './user-settings';

export const userRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const authUser = ctx.user;
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, authUser.id),
        });
        const userData = user ? toUser({
            id: user.id,
            firstName: user.firstName ?? authUser.user_metadata.first_name,
            lastName: user.lastName ?? authUser.user_metadata.last_name,
            displayName: user.displayName ?? authUser.user_metadata.display_name,
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
    upsert: protectedProcedure
        .input(userInsertSchema)
        .mutation(async ({ ctx, input }): Promise<User> => {
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
                const authUser = ctx.user;
                await callUserWebhook({
                    email: user.email,
                    firstName: user.firstName ?? authUser.user_metadata.first_name ?? authUser.user_metadata.name,
                    lastName: user.lastName ?? authUser.user_metadata.last_name,
                    source: 'web beta',
                    subscribed: false,
                });
                return user;
            }
        }),
    settings: userSettingsRouter,
});
