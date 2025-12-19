import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../../trpc';
import { buildSessions, previewLinks } from '@onlook/db/src/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a random slug for preview links
 * Min 8 chars, alphanumeric, URL-safe
 */
function generatePreviewSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = 12; // 12 chars = 62^12 combinations (unguessable)
    let slug = '';
    for (let i = 0; i < length; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
}

/**
 * Static teaser data for Phase 2
 * In Phase 3, this will be replaced with real audit results
 */
const STATIC_TEASER_DATA = {
    teaserScore: 68,
    teaserSummary: {
        issuesFound: 36,
        teaserIssues: [
            {
                severity: 'critical',
                axis: 'ACC',
                title: 'Insufficient color contrast on CTA button',
                description: 'Primary CTA button has 3.2:1 contrast ratio',
                reason: 'Fails WCAG AA (4.5:1)',
                impact: 'Lost conversions, accessibility compliance risk',
            },
            {
                severity: 'high',
                axis: 'HIE',
                title: 'Inconsistent heading hierarchy',
                description: 'H1 → H3 skip detected, no H2 present',
                reason: 'Confuses screen readers and visual scanners',
                impact: 'Users miss key information',
            },
            {
                severity: 'medium',
                axis: 'SPA',
                title: 'Inconsistent spacing in grid layout',
                description: 'Card gaps vary between 12px, 16px, and 20px',
                reason: 'No spacing system enforced',
                impact: 'Looks unpolished, reduces trust',
            },
        ],
    },
};

export const buildSessionRouter = createTRPCRouter({
    /**
     * Create a new build session (anonymous or authenticated)
     * Generates a preview link for sharing
     */
    create: publicProcedure
        .input(
            z.object({
                inputType: z.enum(['idea', 'url']),
                inputValue: z.string().min(1),
                language: z.enum(['en', 'es']).default('en'),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Create build session
            const [buildSession] = await ctx.db
                .insert(buildSessions)
                .values({
                    inputType: input.inputType,
                    inputValue: input.inputValue,
                    language: input.language,
                    userId: ctx.user?.id || null, // Null for anonymous
                    status: 'created',
                    teaserScore: STATIC_TEASER_DATA.teaserScore,
                    teaserSummary: STATIC_TEASER_DATA.teaserSummary,
                })
                .returning();

            if (!buildSession) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create build session',
                });
            }

            // Generate preview link
            const slug = generatePreviewSlug();
            const [previewLink] = await ctx.db
                .insert(previewLinks)
                .values({
                    buildSessionId: buildSession.id,
                    slug,
                })
                .returning();

            if (!previewLink) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create preview link',
                });
            }

            return {
                buildSessionId: buildSession.id,
                previewSlug: previewLink.slug,
            };
        }),

    /**
     * Get teaser report (free tier)
     * Returns static data for Phase 2
     */
    getTeaser: publicProcedure
        .input(
            z.object({
                buildSessionId: z.string().uuid().optional(),
                previewSlug: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (!input.buildSessionId && !input.previewSlug) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Either buildSessionId or previewSlug must be provided',
                });
            }

            let buildSession;

            if (input.previewSlug) {
                // Lookup by preview slug
                const [previewLink] = await ctx.db
                    .select()
                    .from(previewLinks)
                    .where(eq(previewLinks.slug, input.previewSlug))
                    .limit(1);

                if (!previewLink) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Preview link not found',
                    });
                }

                // Check expiration
                if (previewLink.expiresAt && new Date() > previewLink.expiresAt) {
                    throw new TRPCError({
                        code: 'GONE',
                        message: 'Preview link has expired',
                    });
                }

                [buildSession] = await ctx.db
                    .select()
                    .from(buildSessions)
                    .where(eq(buildSessions.id, previewLink.buildSessionId))
                    .limit(1);
            } else if (input.buildSessionId) {
                // Lookup by build session ID
                [buildSession] = await ctx.db
                    .select()
                    .from(buildSessions)
                    .where(eq(buildSessions.id, input.buildSessionId))
                    .limit(1);
            }

            if (!buildSession) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Build session not found',
                });
            }

            return {
                id: buildSession.id,
                teaserScore: buildSession.teaserScore,
                teaserSummary: buildSession.teaserSummary,
                locked: true, // Always locked in Phase 2 (paywall)
                inputType: buildSession.inputType,
                inputValue: buildSession.inputValue,
                language: buildSession.language,
                createdAt: buildSession.createdAt,
            };
        }),

    /**
     * List build sessions for authenticated user
     */
    list: protectedProcedure.query(async ({ ctx }) => {
        const sessions = await ctx.db
            .select({
                id: buildSessions.id,
                inputType: buildSessions.inputType,
                inputValue: buildSessions.inputValue,
                teaserScore: buildSessions.teaserScore,
                status: buildSessions.status,
                createdAt: buildSessions.createdAt,
            })
            .from(buildSessions)
            .where(eq(buildSessions.userId, ctx.user.id))
            .orderBy(buildSessions.createdAt);

        return sessions;
    }),
});
