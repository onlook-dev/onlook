import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { userPresence, users, userProjects } from '@onlook/db';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const presenceRouter = createTRPCRouter({
    joinProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { projectId } = input;
            const userId = ctx.user.id;

            const projectAccess = await ctx.db.query.userProjects.findFirst({
                where: and(
                    eq(userProjects.userId, userId),
                    eq(userProjects.projectId, projectId)
                ),
            });

            if (!projectAccess) {
                throw new Error('User does not have access to this project');
            }

            await ctx.db.insert(userPresence).values({
                projectId,
                userId,
                isOnline: true,
                lastSeen: new Date(),
            }).onConflictDoUpdate({
                target: [userPresence.projectId, userPresence.userId],
                set: {
                    isOnline: true,
                    lastSeen: new Date(),
                    updatedAt: new Date(),
                },
            });

            return { success: true };
        }),

    leaveProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { projectId } = input;
            const userId = ctx.user.id;

            await ctx.db.update(userPresence)
                .set({
                    isOnline: false,
                    lastSeen: new Date(),
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(userPresence.projectId, projectId),
                    eq(userPresence.userId, userId)
                ));

            return { success: true };
        }),

    getProjectPresence: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { projectId } = input;

            const projectAccess = await ctx.db.query.userProjects.findFirst({
                where: and(
                    eq(userProjects.userId, ctx.user.id),
                    eq(userProjects.projectId, projectId)
                ),
            });

            if (!projectAccess) {
                throw new Error('User does not have access to this project');
            }

            const presenceData = await ctx.db.query.userPresence.findMany({
                where: and(
                    eq(userPresence.projectId, projectId),
                    eq(userPresence.isOnline, true)
                ),
                with: {
                    user: {
                        columns: {
                            id: true,
                            displayName: true,
                            avatarUrl: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: desc(userPresence.lastSeen),
            });

            return presenceData.map(p => ({
                userId: p.user.id,
                displayName: p.user.displayName || `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim(),
                avatarUrl: p.user.avatarUrl,
                lastSeen: p.lastSeen,
            }));
        }),

    getMyPresence: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user.id;

            const presenceData = await ctx.db.query.userPresence.findMany({
                where: eq(userPresence.userId, userId),
                with: {
                    project: {
                        columns: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return presenceData.map(p => ({
                projectId: p.project.id,
                projectName: p.project.name,
                isOnline: p.isOnline,
                lastSeen: p.lastSeen,
            }));
        }),

    cleanupOffline: protectedProcedure
        .mutation(async ({ ctx }) => {
            await ctx.db.update(userPresence)
                .set({
                    isOnline: false,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(userPresence.isOnline, true),
                ));

            return { success: true };
        }),
});
