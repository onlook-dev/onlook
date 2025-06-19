import { subscriptions, toSubscription, usageRecords, subscriptionService } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import type { Usage } from '@onlook/models';
import { 
    createCheckoutSession, 
    createCustomer, 
    createCustomerPortalSession,
    cancelSubscription as stripeCancelSubscription,
    resumeSubscription as stripeResumeSubscription,
    updateSubscription as stripeUpdateSubscription,
    listPrices
} from '@onlook/stripe';
import { TRPCError } from '@trpc/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const subscriptionRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                plan: true
            },
        });

        if (!subscription) {
            console.error('No active subscription found for user', user.id);
            return null;
        }
        return toSubscription(subscription);
    }),

    getUsage: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                plan: true,
            },
        });

        if (!subscription) {
            console.error('No subscription found');
            return null;
        }

        // Calculate date ranges
        const now = new Date();
        const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        // Count records from last day
        const lastDayCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.subscriptionId, subscription.id),
                    gte(usageRecords.timestamp, lastDay)
                )
            );

        // Count records from last month
        const lastMonthCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.subscriptionId, subscription.id),
                    gte(usageRecords.timestamp, lastMonth)
                )
            );

        return {
            daily: {
                period: 'day',
                usageCount: lastDayCount[0]?.count || 0,
                limitCount: subscription.plan.dailyMessages,
            } satisfies Usage,
            monthly: {
                period: 'month',
                usageCount: lastMonthCount[0]?.count || 0,
                limitCount: subscription.plan.monthlyMessages,
            } satisfies Usage,
        };
    }),

    createCheckoutSession: protectedProcedure
        .input(z.object({
            priceId: z.string(),
            successUrl: z.string(),
            cancelUrl: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const user = ctx.user;
            
            // Check if user already has an active subscription
            const existingSubscription = await subscriptionService.getActiveSubscription(user.id);
            if (existingSubscription) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User already has an active subscription',
                });
            }
            
            // Create or get Stripe customer
            let stripeCustomerId = user.stripeCustomerId;
            if (!stripeCustomerId) {
                const customer = await createCustomer({ 
                    name: user.name || user.email, 
                    email: user.email 
                });
                await subscriptionService.updateUserStripeCustomerId(user.id, customer.id);
                stripeCustomerId = customer.id;
            }
            
            // Create checkout session
            const session = await createCheckoutSession({
                customerId: stripeCustomerId,
                priceId: input.priceId,
                successUrl: input.successUrl,
                cancelUrl: input.cancelUrl,
                metadata: {
                    userId: user.id,
                },
            });
            
            return { url: session.url };
        }),

    createCustomerPortalSession: protectedProcedure
        .input(z.object({
            returnUrl: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const user = ctx.user;
            
            if (!user.stripeCustomerId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'No Stripe customer ID found for user',
                });
            }
            
            const session = await createCustomerPortalSession({
                customerId: user.stripeCustomerId,
                returnUrl: input.returnUrl,
            });
            
            return { url: session.url };
        }),

    getAvailablePlans: protectedProcedure.query(async () => {
        const plans = await subscriptionService.getAvailablePlans();
        return plans;
    }),

    getAvailablePrices: protectedProcedure
        .input(z.object({
            productId: z.string().optional(),
        }))
        .query(async ({ input }) => {
            const prices = await listPrices(input.productId);
            return prices.data;
        }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const user = ctx.user;
        
        const subscription = await subscriptionService.getActiveSubscription(user.id);
        if (!subscription) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'No active subscription found',
            });
        }
        
        // Cancel in Stripe
        const stripeSubscription = await stripeCancelSubscription(subscription.stripeSubscriptionId);
        
        // Update in database
        await subscriptionService.updateSubscriptionStatus(
            subscription.stripeSubscriptionId,
            'canceled',
            stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : undefined
        );
        
        return { success: true };
    }),

    resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const user = ctx.user;
        
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, user.id),
                eq(subscriptions.status, 'canceled')
            ),
            orderBy: (subscriptions, { desc }) => [desc(subscriptions.startDate)],
        });
        
        if (!subscription) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'No canceled subscription found',
            });
        }
        
        // Resume in Stripe
        await stripeResumeSubscription(subscription.stripeSubscriptionId);
        
        // Update in database
        await subscriptionService.updateSubscriptionStatus(
            subscription.stripeSubscriptionId,
            'active',
            null
        );
        
        return { success: true };
    }),

    updateSubscription: protectedProcedure
        .input(z.object({
            priceId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const user = ctx.user;
            
            const subscription = await subscriptionService.getActiveSubscription(user.id);
            if (!subscription) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'No active subscription found',
                });
            }
            
            // Get the price details
            const price = await subscriptionService.getPriceByStripePriceId(input.priceId);
            if (!price) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invalid price ID',
                });
            }
            
            // Update in Stripe
            await stripeUpdateSubscription({
                subscriptionId: subscription.stripeSubscriptionId,
                priceId: input.priceId,
            });
            
            // Update in database
            await subscriptionService.updateSubscriptionPlan({
                subscriptionId: subscription.id,
                planId: price.planId,
                priceId: price.id,
            });
            
            return { success: true };
        }),
});
