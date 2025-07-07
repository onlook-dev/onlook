import { callUserWebhook } from '@/utils/n8n/webhook';
import { toUser, userInsertSchema, users, type User } from '@onlook/db';
import { extractNames } from '@onlook/utility';
import type { User as SupabaseUser } from "@supabase/supabase-js";
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

        const { displayName, firstName, lastName } = getUserName(authUser);
        const userData = user ? toUser({
            id: user.id,
            firstName: user.firstName ?? firstName,
            lastName: user.lastName ?? lastName,
            displayName: user.displayName ?? displayName,
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

                const { firstName, lastName, displayName } = getUserName(authUser);

                await callUserWebhook({
                    email: user.email,
                    firstName: user.firstName ?? firstName,
                    lastName: user.lastName ?? lastName,
                    source: 'web beta',
                    subscribed: false,
                });
                return user;
            }
        }),
    settings: userSettingsRouter,
});

function getUserName(authUser: SupabaseUser) {
    const displayName: string | undefined = authUser.user_metadata.name;
    const { firstName, lastName } = extractNames(displayName ?? '');
    return {
        displayName: displayName ?? '',
        firstName,
        lastName,
    };
}