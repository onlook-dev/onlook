import { toUser, userProjects, users } from '@onlook/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const memberRouter = createTRPCRouter({
    list: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const members = await ctx.db
                .select({
                    role: userProjects.role,
                    user: users,
                })
                .from(userProjects)
                .innerJoin(users, eq(userProjects.userId, users.id))
                .where(eq(userProjects.projectId, input.projectId));

            return members.map((member) => ({
                role: member.role,
                user: toUser(member.user),
            }));
        }),
    remove: protectedProcedure
        .input(z.object({ userId: z.string(), projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(userProjects)
                .where(
                    and(
                        eq(userProjects.userId, input.userId),
                        eq(userProjects.projectId, input.projectId),
                    ),
                );

            return true;
        }),
});
