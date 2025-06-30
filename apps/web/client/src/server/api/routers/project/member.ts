import { toUser, userProjects } from '@onlook/db';
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
            const members = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.projectId, input.projectId),
                with: {
                    user: true,
                },
            });
            // TODO: Fix this later
            return members.map((member) => ({
                role: member.role,
                user: toUser({
                    id: member.user.id,
                    name: '',
                    email: member.user.email,
                    avatarUrl: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
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
