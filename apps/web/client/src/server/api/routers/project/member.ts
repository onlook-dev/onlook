import { fromDbUser, userProjects } from '@onlook/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyProjectAccess } from './helper';

export const memberRouter = createTRPCRouter({
    list: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
            const members = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.projectId, input.projectId),
                with: {
                    user: true,
                },
            });
            // TODO: Fix this later
            return members.map((member) => ({
                role: member.role,
                user: fromDbUser({
                    id: member.user.id,
                    email: member.user.email,
                    createdAt: new Date(),
                    updatedAt: new Date(),

                    // @ts-expect-error - TODO: Fix this later
                    firstName: member.user.firstName ?? '',
                    // @ts-expect-error - TODO: Fix this later
                    lastName: member.user.lastName ?? '',
                    // @ts-expect-error - TODO: Fix this later
                    displayName: member.user.displayName ?? '',
                    // @ts-expect-error - TODO: Fix this later
                    avatarUrl: member.user.avatarUrl ?? '',
                    // @ts-expect-error - TODO: Fix this later
                    stripeCustomerId: member.user.stripeCustomerId ?? null,
                    // @ts-expect-error - TODO: Fix this later
                    githubInstallationId: member.user.githubInstallationId ?? null,
                }),
            }));
        }),
    remove: protectedProcedure
        .input(z.object({ userId: z.string(), projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Removing yourself (leaving a project) or removing another member
            // both require the caller to already be a project member. This
            // does not yet distinguish by role (e.g. only owners removing
            // others) -- ProjectRole exists as data but no role-gated
            // authorization exists anywhere else in this router either, so
            // that's a separate product decision left to a follow-up.
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
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
