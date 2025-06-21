import { authUsers, fromAuthUser, userProjects } from '@onlook/db';
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
                .select()
                .from(userProjects)
                .innerJoin(authUsers, eq(userProjects.userId, authUsers.id))
                .where(eq(userProjects.projectId, input.projectId));

            return members.map((member) => {
                return {
                    ...member.user_projects,
                    user: fromAuthUser(member.users),
                };
            });
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
