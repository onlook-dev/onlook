import { env } from '@/env';
import { trackEvent } from '@/utils/analytics/server';
import { feedbacks, feedbackSubmitSchema, type NewFeedback } from '@onlook/db';
import { getResendClient, sendFeedbackNotificationEmail } from '@onlook/email';
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { createTRPCRouter, publicProcedure } from '../trpc';

const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

export const feedbackRouter = createTRPCRouter({
    submit: publicProcedure
        .input(feedbackSubmitSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user?.id;
            const userEmail = ctx.user?.email ?? input.email;

            // Rate limiting check for authenticated users
            if (userId) {
                const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000);

                const recentSubmissions = await ctx.db
                    .select({ count: count() })
                    .from(feedbacks)
                    .where(
                        and(
                            eq(feedbacks.userId, userId),
                            gte(feedbacks.createdAt, oneHourAgo)
                        )
                    );

                const submissionCount = recentSubmissions[0]?.count || 0;

                if (submissionCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
                    throw new TRPCError({
                        code: 'TOO_MANY_REQUESTS',
                        message: `Too many feedback submissions. Please wait before submitting again.`,
                    });
                }
            }

            // Validate required fields
            if (!input.message?.trim()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Message is required',
                });
            }

            // For anonymous users, require email
            if (!userId && !userEmail) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Email is required for anonymous feedback',
                });
            }

            // Create feedback record
            const newFeedback: NewFeedback = {
                userId: userId || null,
                email: userEmail || null,
                message: input.message.trim(),
                pageUrl: input.pageUrl || null,
                userAgent: input.userAgent || null,
                attachments: input.attachments || [],
                metadata: input.metadata || {},
            };

            const [feedback] = await ctx.db
                .insert(feedbacks)
                .values(newFeedback)
                .returning();

            if (!feedback) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create feedback record',
                });
            }

            // Send email notification
            try {
                if (env.RESEND_API_KEY) {
                    const resendClient = getResendClient({ apiKey: env.RESEND_API_KEY });
                    await sendFeedbackNotificationEmail(resendClient, {
                        message: feedback.message,
                        userEmail: feedback.email,
                        userName: userId ? ctx.user?.user_metadata?.name || ctx.user?.user_metadata?.display_name : null,
                        pageUrl: feedback.pageUrl,
                        userAgent: feedback.userAgent,
                        attachments: feedback.attachments as Array<{
                            name: string;
                            size: number;
                            type: string;
                            url: string;
                            uploadedAt: string;
                        }>,
                        metadata: feedback.metadata as Record<string, any>,
                        submittedAt: feedback.createdAt,
                    }, {
                        dryRun: env.NODE_ENV !== 'production',
                    });
                }
            } catch (error) {
                console.error('Failed to send feedback email:', error);
                // Don't throw error - email failure shouldn't block feedback submission
            }

            // Send N8N webhook for Slack notification  
            try {
                if (env.N8N_WEBHOOK_URL && env.N8N_API_KEY) {
                    await fetch(env.N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: {
                            'n8n-api-key': env.N8N_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: 'feedback',
                            message: feedback.message,
                            userEmail: feedback.email,
                            userName: userId ? ctx.user?.user_metadata?.name || ctx.user?.user_metadata?.display_name : 'Anonymous',
                            pageUrl: feedback.pageUrl,
                            submittedAt: feedback.createdAt.toISOString(),
                            feedbackId: feedback.id,
                        }),
                    });
                }
            } catch (error) {
                console.error('Failed to send N8N webhook:', error);
                // Don't throw error - webhook failure shouldn't block feedback submission
            }

            // Track feedback submission event
            try {
                await trackEvent({
                    distinctId: userId ?? 'unknown',
                    event: 'feedback_submitted',
                    properties: {
                        feedbackId: feedback.id,
                        hasEmail: !!feedback.email,
                        messageLength: feedback.message.length,
                        pageUrl: feedback.pageUrl,
                        isAuthenticated: !!userId,
                    },
                });
            } catch (error) {
                console.error('Failed to track feedback event:', error);
            }

            return {
                success: true,
                id: feedback.id,
            };
        }),

    // Admin endpoint to fetch feedback (protected)
    list: publicProcedure
        .query(async ({ ctx }) => {
            // This would typically be an admin-only procedure
            // For now, returning empty array for security
            if (!ctx.user || ctx.user.email !== 'contact@onlook.com') {
                return [];
            }

            const feedbackList = await ctx.db.query.feedbacks.findMany({
                orderBy: desc(feedbacks.createdAt),
                limit: 50,
                with: {
                    user: true,
                },
            });

            return feedbackList;
        }),
});