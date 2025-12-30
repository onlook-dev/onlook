import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../../trpc';
import { buildSessions, previewLinks } from '@onlook/db/src/schema';
import { eq } from 'drizzle-orm';
import { startBuildSessionAudit } from './build-session-processor';

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
            // Create build session (Phase 3: no static data, audit will populate)
            const [buildSession] = await ctx.db
                .insert(buildSessions)
                .values({
                    inputType: input.inputType,
                    inputValue: input.inputValue,
                    language: input.language,
                    userId: ctx.user?.id || null, // Null for anonymous
                    status: 'created',
                    auditStatus: 'pending',
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

            // Start audit processing in background (non-blocking)
            await startBuildSessionAudit({
                buildSessionId: buildSession.id,
                inputType: input.inputType,
                inputValue: input.inputValue,
                userId: ctx.user?.id || null,
            });

            return {
                buildSessionId: buildSession.id,
                previewSlug: previewLink.slug,
            };
        }),

    /**
     * Get teaser report (free tier)
     * Phase 3: Returns real audit data or progress status
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

            // Phase 3: Check audit status
            const auditStatus = buildSession.auditStatus;

            if (auditStatus !== 'completed') {
                // Return progress status
                return {
                    id: buildSession.id,
                    auditStatus,
                    progress: auditStatus === 'pending' ? 0 : 50, // Simple progress indicator
                    inputType: buildSession.inputType,
                    inputValue: buildSession.inputValue,
                    language: buildSession.language,
                    createdAt: buildSession.createdAt,
                };
            }

            // Audit completed - return real teaser data
            return {
                id: buildSession.id,
                auditStatus: 'completed',
                teaserScore: buildSession.teaserScore,
                teaserSummary: buildSession.teaserSummary,
                locked: true, // Always locked (paywall)
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

    /**
     * Claim anonymous session (Phase 3)
     * Allows authenticated users to attach their user ID to an anonymous session
     */
    claim: protectedProcedure
        .input(z.object({ buildSessionId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            // Get the build session
            const [buildSession] = await ctx.db
                .select()
                .from(buildSessions)
                .where(eq(buildSessions.id, input.buildSessionId))
                .limit(1);

            if (!buildSession) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Build session not found',
                });
            }

            // Check if already claimed
            if (buildSession.userId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Build session already claimed',
                });
            }

            // Claim the session
            await ctx.db
                .update(buildSessions)
                .set({
                    userId: ctx.user.id,
                    updatedAt: new Date(),
                })
                .where(eq(buildSessions.id, input.buildSessionId));

            return { success: true, buildSessionId: input.buildSessionId };
        }),
});
