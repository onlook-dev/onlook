import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { audits, auditInsertSchema } from '@onlook/db/src/schema';
import { eq, desc } from 'drizzle-orm';
import { AuditStatus } from '@onlook/models';
import { startAuditProcessing } from './processor';

export const auditRouter = createTRPCRouter({
    /**
     * Create a new audit and start processing
     */
    create: protectedProcedure
        .input(
            z.object({
                projectId: z.string().uuid(),
                targetType: z.enum(['url', 'screenshot', 'frame', 'component']),
                targetValue: z.string(),
                context: z
                    .object({
                        productType: z.string().optional(),
                        audience: z.string().optional(),
                        goal: z.string().optional(),
                    })
                    .optional(),
                constraints: z
                    .object({
                        brand: z.record(z.unknown()).optional(),
                        stack: z.array(z.string()).optional(),
                        timeline: z.string().optional(),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .insert(audits)
                .values({
                    projectId: input.projectId,
                    userId: ctx.user.id,
                    targetType: input.targetType,
                    targetValue: input.targetValue,
                    context: input.context,
                    constraints: input.constraints,
                    status: AuditStatus.PENDING,
                })
                .returning();

            // Start processing in the background
            await startAuditProcessing(audit.id);

            return audit;
        }),

    /**
     * Get audit by ID
     */
    get: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .select()
                .from(audits)
                .where(eq(audits.id, input.id))
                .limit(1);

            if (!audit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audit not found',
                });
            }

            if (audit.userId !== ctx.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized to view this audit',
                });
            }

            return audit;
        }),

    /**
     * List audits for a project
     */
    list: protectedProcedure
        .input(z.object({ projectId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const auditsList = await ctx.db
                .select()
                .from(audits)
                .where(eq(audits.projectId, input.projectId))
                .orderBy(desc(audits.createdAt));

            return auditsList;
        }),

    /**
     * Get teaser report (free tier)
     */
    getTeaser: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .select({
                    id: audits.id,
                    status: audits.status,
                    overallScore: audits.overallScore,
                    udecScores: audits.udecScores,
                    issuesFoundTotal: audits.issuesFoundTotal,
                    teaserIssues: audits.teaserIssues,
                    createdAt: audits.createdAt,
                    completedAt: audits.completedAt,
                })
                .from(audits)
                .where(eq(audits.id, input.id))
                .limit(1);

            if (!audit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audit not found',
                });
            }

            if (audit.status !== AuditStatus.COMPLETED) {
                return {
                    ...audit,
                    message: 'Audit is still in progress',
                };
            }

            return audit;
        }),

    /**
     * Get full report (requires subscription check)
     */
    getFull: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .select()
                .from(audits)
                .where(eq(audits.id, input.id))
                .limit(1);

            if (!audit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audit not found',
                });
            }

            if (audit.userId !== ctx.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized to view this audit',
                });
            }

            // TODO: Add subscription tier check here
            // For now, return full report for all users
            // In production, check if user has Pro/Studio/Enterprise tier

            if (audit.status !== AuditStatus.COMPLETED) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Audit is not yet completed',
                });
            }

            return audit;
        }),

    /**
     * Update audit status
     */
    updateStatus: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                status: z.enum([
                    AuditStatus.PENDING,
                    AuditStatus.RUNNING,
                    AuditStatus.COMPLETED,
                    AuditStatus.FAILED,
                ]),
                errorMessage: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .update(audits)
                .set({
                    status: input.status,
                    errorMessage: input.errorMessage,
                    updatedAt: new Date(),
                    completedAt: input.status === AuditStatus.COMPLETED ? new Date() : undefined,
                })
                .where(eq(audits.id, input.id))
                .returning();

            return audit;
        }),

    /**
     * Save audit results
     */
    saveResults: protectedProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                overallScore: z.number(),
                udecScores: z.record(z.number()),
                issuesFoundTotal: z.number(),
                teaserIssues: z.array(z.any()),
                fullIssues: z.array(z.any()),
                fixPacks: z.array(z.any()).optional(),
                tokenChanges: z.array(z.any()).optional(),
                patchPlan: z.any().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const [audit] = await ctx.db
                .update(audits)
                .set({
                    overallScore: input.overallScore,
                    udecScores: input.udecScores,
                    issuesFoundTotal: input.issuesFoundTotal,
                    teaserIssues: input.teaserIssues,
                    fullIssues: input.fullIssues,
                    fixPacks: input.fixPacks,
                    tokenChanges: input.tokenChanges,
                    patchPlan: input.patchPlan,
                    status: AuditStatus.COMPLETED,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(audits.id, input.id))
                .returning();

            return audit;
        }),
});
