import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { buildSessions, previewLinks } from '@onlook/db/src/schema';
import { eq } from 'drizzle-orm';

export const previewRouter = createTRPCRouter({
    /**
     * Get build session by preview slug
     * Public endpoint for viral sharing
     */
    getBySlug: publicProcedure
        .input(z.object({ slug: z.string().min(8) }))
        .query(async ({ ctx, input }) => {
            // Lookup preview link
            const [previewLink] = await ctx.db
                .select()
                .from(previewLinks)
                .where(eq(previewLinks.slug, input.slug))
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

            // Fetch build session
            const [buildSession] = await ctx.db
                .select({
                    id: buildSessions.id,
                    inputType: buildSessions.inputType,
                    inputValue: buildSessions.inputValue,
                    teaserScore: buildSessions.teaserScore,
                    teaserSummary: buildSessions.teaserSummary,
                    status: buildSessions.status,
                    language: buildSessions.language,
                    createdAt: buildSessions.createdAt,
                })
                .from(buildSessions)
                .where(eq(buildSessions.id, previewLink.buildSessionId))
                .limit(1);

            if (!buildSession) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Build session not found',
                });
            }

            return {
                buildSession,
                previewSlug: previewLink.slug,
                locked: true, // Always locked in Phase 2 (paywall)
            };
        }),
});
