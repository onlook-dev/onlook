/**
 * Fix Pack Router - Generates and manages Cynthia fix packs
 * Phase 4: Preview generation (no auto-apply yet)
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { audits, fixPacks } from '@onlook/db/src/schema';
import { eq, and } from 'drizzle-orm';
import { checkCredits, consumeCredits } from '../../services/credit-service';

/**
 * Generate fix pack preview from audit data
 * Phase 4: Uses audit.fixPacks from completed audit
 * Phase 5: Will integrate with real code generation
 */
function generateFixPackPreview(
    auditData: any,
    type: 'token' | 'layout' | 'component' | 'motion' | 'content'
) {
    // Extract relevant fix pack from audit results
    const fixPacksData = auditData.fixPacks || [];
    const relevantFix = fixPacksData.find((fp: any) => fp.type === type);

    if (!relevantFix) {
        // Generate stub if not in audit data
        return {
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Fixes`,
            description: `Automated ${type} improvements based on UDEC analysis`,
            patchPreview: {
                diffs: [
                    {
                        file: 'src/styles/tokens.css',
                        before: '/* Original code */',
                        after: '/* Fixed code */',
                        linesChanged: 5,
                    },
                ],
            },
            filesAffected: ['src/styles/tokens.css'],
            issuesFixed: [],
        };
    }

    return {
        title: relevantFix.title || `${type} Fixes`,
        description: relevantFix.description || `Fixes for ${type}`,
        patchPreview: relevantFix.patchPreview || {},
        filesAffected: relevantFix.filesAffected || [],
        issuesFixed: relevantFix.issuesFixed || [],
    };
}

export const fixPackRouter = createTRPCRouter({
    /**
     * Generate a fix pack preview
     * Costs 1 credit
     */
    generate: protectedProcedure
        .input(
            z.object({
                auditId: z.string().uuid(),
                type: z.enum(['token', 'layout', 'component', 'motion', 'content']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            // Get the audit
            const [audit] = await ctx.db
                .select()
                .from(audits)
                .where(eq(audits.id, input.auditId))
                .limit(1);

            if (!audit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audit not found',
                });
            }

            // Verify ownership
            if (audit.userId !== userId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized to generate fix packs for this audit',
                });
            }

            // Check if audit is completed
            if (audit.status !== 'completed') {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Audit must be completed before generating fix packs',
                });
            }

            // Check credits
            const creditCheck = await checkCredits(userId);
            if (!creditCheck.hasCredits) {
                throw new TRPCError({
                    code: 'PAYMENT_REQUIRED',
                    message: `No credits remaining. You've used ${creditCheck.used}/${creditCheck.total} credits.`,
                });
            }

            // Consume 1 credit
            const consumed = await consumeCredits(userId, 1);
            if (!consumed) {
                throw new TRPCError({
                    code: 'PAYMENT_REQUIRED',
                    message: 'Insufficient credits',
                });
            }

            // Generate fix pack preview
            const preview = generateFixPackPreview(audit, input.type);

            // Save fix pack to database
            const [fixPack] = await ctx.db
                .insert(fixPacks)
                .values({
                    auditId: input.auditId,
                    userId,
                    type: input.type,
                    title: preview.title,
                    description: preview.description,
                    patchPreview: preview.patchPreview,
                    filesAffected: preview.filesAffected,
                    issuesFixed: preview.issuesFixed,
                })
                .returning();

            if (!fixPack) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create fix pack',
                });
            }

            return {
                id: fixPack.id,
                preview: preview.patchPreview,
                diffSummary: {
                    filesAffected: preview.filesAffected.length,
                    linesChanged: preview.patchPreview.diffs?.reduce(
                        (sum: number, d: any) => sum + (d.linesChanged || 0),
                        0
                    ) || 0,
                },
                creditsRemaining: creditCheck.remaining - 1,
            };
        }),

    /**
     * List fix packs for an audit
     */
    list: protectedProcedure
        .input(z.object({ auditId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            // Verify audit ownership
            const [audit] = await ctx.db
                .select()
                .from(audits)
                .where(eq(audits.id, input.auditId))
                .limit(1);

            if (!audit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Audit not found',
                });
            }

            if (audit.userId !== userId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized',
                });
            }

            // Get fix packs
            const packs = await ctx.db
                .select({
                    id: fixPacks.id,
                    type: fixPacks.type,
                    title: fixPacks.title,
                    description: fixPacks.description,
                    filesAffected: fixPacks.filesAffected,
                    issuesFixed: fixPacks.issuesFixed,
                    createdAt: fixPacks.createdAt,
                    applied: fixPacks.applied,
                })
                .from(fixPacks)
                .where(
                    and(
                        eq(fixPacks.auditId, input.auditId),
                        eq(fixPacks.userId, userId)
                    )
                );

            return packs;
        }),

    /**
     * Get fix pack details (including patch preview)
     */
    get: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            const [fixPack] = await ctx.db
                .select()
                .from(fixPacks)
                .where(eq(fixPacks.id, input.id))
                .limit(1);

            if (!fixPack) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Fix pack not found',
                });
            }

            if (fixPack.userId !== userId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Not authorized',
                });
            }

            return fixPack;
        }),
});
