/**
 * Apply Run Router - Phase 5
 * Tracks GitHub PR creation and OpenHands repair status
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { applyRuns } from '@onlook/db/src/schema';
import { eq, and, desc } from 'drizzle-orm';

export const applyRunRouter = createTRPCRouter({
    /**
     * Get apply run status by ID
     */
    getStatus: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            const [applyRun] = await ctx.db
                .select()
                .from(applyRuns)
                .where(eq(applyRuns.id, input.id))
                .limit(1);

            if (!applyRun) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Apply run not found',
                });
            }

            if (applyRun.userId !== userId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized',
                });
            }

            return {
                id: applyRun.id,
                status: applyRun.status,
                repoOwner: applyRun.repoOwner,
                repoName: applyRun.repoName,
                branch: applyRun.branch,
                prNumber: applyRun.prNumber,
                prUrl: applyRun.prUrl,
                logs: applyRun.logs,
                error: applyRun.error,
                createdAt: applyRun.createdAt,
                updatedAt: applyRun.updatedAt,
            };
        }),

    /**
     * List all apply runs for the current user
     */
    list: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                offset: z.number().min(0).default(0),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;
            const { limit = 20, offset = 0 } = input || {};

            const runs = await ctx.db
                .select({
                    id: applyRuns.id,
                    status: applyRuns.status,
                    repoOwner: applyRuns.repoOwner,
                    repoName: applyRuns.repoName,
                    branch: applyRuns.branch,
                    prNumber: applyRuns.prNumber,
                    prUrl: applyRuns.prUrl,
                    error: applyRuns.error,
                    createdAt: applyRuns.createdAt,
                    updatedAt: applyRuns.updatedAt,
                })
                .from(applyRuns)
                .where(eq(applyRuns.userId, userId))
                .orderBy(desc(applyRuns.createdAt))
                .limit(limit)
                .offset(offset);

            return runs;
        }),

    /**
     * List apply runs for a specific audit
     */
    listByAudit: protectedProcedure
        .input(z.object({ auditId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            const runs = await ctx.db
                .select({
                    id: applyRuns.id,
                    fixPackId: applyRuns.fixPackId,
                    status: applyRuns.status,
                    repoOwner: applyRuns.repoOwner,
                    repoName: applyRuns.repoName,
                    branch: applyRuns.branch,
                    prNumber: applyRuns.prNumber,
                    prUrl: applyRuns.prUrl,
                    error: applyRuns.error,
                    createdAt: applyRuns.createdAt,
                })
                .from(applyRuns)
                .where(
                    and(
                        eq(applyRuns.auditId, input.auditId),
                        eq(applyRuns.userId, userId)
                    )
                )
                .orderBy(desc(applyRuns.createdAt));

            return runs;
        }),
});
