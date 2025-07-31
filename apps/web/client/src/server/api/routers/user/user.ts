import { trackEvent } from '@/utils/analytics/server';
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
            ...user,
            firstName: user.firstName ?? firstName,
            lastName: user.lastName ?? lastName,
            displayName: user.displayName ?? displayName,
            email: user.email ?? authUser.email,
            avatarUrl: user.avatarUrl ?? authUser.user_metadata.avatarUrl,
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
        .mutation(async ({ ctx, input }): Promise<User | null> => {
            const authUser = ctx.user;

            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, input.id),
            });

            const { firstName, lastName, displayName } = getUserName(authUser);

            const userData = {
                id: input.id,
                firstName: input.firstName ?? firstName,
                lastName: input.lastName ?? lastName,
                displayName: input.displayName ?? displayName,
                email: input.email ?? authUser.email,
                avatarUrl: input.avatarUrl ?? authUser.user_metadata.avatarUrl,
            };

            const [user] = await ctx.db
                .insert(users)
                .values(userData)
                .onConflictDoUpdate({
                    target: [users.id],
                    set: {
                        ...userData,
                        updatedAt: new Date(),
                    },
                }).returning();

            if (!existingUser) {
                await trackEvent({
                    distinctId: input.id,
                    event: 'user_first_signup',
                    properties: {
                        email: userData.email,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        displayName: userData.displayName,
                        source: 'web beta',
                    },
                });

                await callUserWebhook({
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    source: 'web beta',
                    subscribed: false,
                });
            }

            return user ?? null;
        }),
    settings: userSettingsRouter,
});

function getUserName(authUser: SupabaseUser) {
    const displayName: string | undefined = authUser.user_metadata.name ?? authUser.user_metadata.display_name ?? authUser.user_metadata.full_name ?? authUser.user_metadata.first_name ?? authUser.user_metadata.last_name ?? authUser.user_metadata.given_name ?? authUser.user_metadata.family_name;
    const { firstName, lastName } = extractNames(displayName ?? '');
    return {
        displayName: displayName ?? '',
        firstName,
        lastName,
    };
}
