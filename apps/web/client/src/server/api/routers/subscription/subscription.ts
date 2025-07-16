import { Routes } from '@/utils/constants';
import { legacySubscriptions, prices, subscriptions, toSubscription } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { createBillingPortalSession, createCheckoutSession, PriceKey, releaseSubscriptionSchedule, SubscriptionStatus, updateSubscription, updateSubscriptionNextPeriod } from '@onlook/stripe';
import { and, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const subscriptionRouter = createTRPCRouter({
    getLegacySubscriptions: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.legacySubscriptions.findFirst({
            where: and(
                eq(legacySubscriptions.email, user.email),
                isNull(legacySubscriptions.redeemAt),
            ),
        });
        return subscription;
    }),
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, user.id),
                eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            ),
            with: {
                product: true,
                price: true,
            },
        });

        if (!subscription) {
            console.error('No active subscription found for user', user.id);
            return null;
        }

        // If there is a scheduled price, we need to fetch it from the database.
        let scheduledPrice = null;
        if (subscription.scheduledPriceId) {
            scheduledPrice = await db.query.prices.findFirst({
                where: eq(prices.id, subscription.scheduledPriceId),
            }) ?? null;
        }

        return toSubscription(subscription, scheduledPrice);
    }),
    getPriceId: protectedProcedure.input(z.object({
        priceKey: z.nativeEnum(PriceKey),
    })).mutation(async ({ input }) => {
        const price = await db.query.prices.findFirst({
            where: eq(prices.key, input.priceKey),
        });

        if (!price) {
            throw new Error(`Price not found for key: ${input.priceKey}`);
        }

        return price.stripePriceId;
    }),
    checkout: protectedProcedure.input(z.object({
        priceId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const originUrl = (await headers()).get('origin');
        const user = ctx.user;
        const session = await createCheckoutSession({
            priceId: input.priceId,
            userId: user.id,
            successUrl: `${originUrl}${Routes.CALLBACK_STRIPE_SUCCESS}`,
            cancelUrl: `${originUrl}${Routes.CALLBACK_STRIPE_CANCEL}`,
        });

        return session;
    }),
    manageSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, user.id),
                eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            ),
        });

        if (!subscription) {
            throw new Error('No active subscription found for user');
        }

        const originUrl = (await headers()).get('origin');

        const session = await createBillingPortalSession({
            customerId: subscription.stripeCustomerId,
            returnUrl: `${originUrl}/subscription/manage`,
        });

        return session;
    }),
    update: protectedProcedure.input(z.object({
        stripeSubscriptionId: z.string(),
        stripeSubscriptionItemId: z.string(),
        stripePriceId: z.string(),
    })).mutation(async ({ input }) => {
        const { stripeSubscriptionId, stripeSubscriptionItemId, stripePriceId } = input;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
                eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId),
            ),
            with: {
                price: true,
            },
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const currentPrice = subscription.price;
        const newPrice = await db.query.prices.findFirst({
            where: eq(prices.stripePriceId, stripePriceId),
        });

        if (!newPrice) {
            throw new Error(`Price not found for priceId: ${stripePriceId}`);
        }

        // If there is a future scheduled change, we release it.
        if (subscription.stripeSubscriptionScheduleId) {
            await releaseSubscriptionSchedule({
                subscriptionScheduleId: subscription.stripeSubscriptionScheduleId,
            });
        }

        const isUpgrade = newPrice?.monthlyMessageLimit > currentPrice.monthlyMessageLimit;
        if (isUpgrade) {
            // If the new price is higher, we invoice the customer immediately.
            const updatedSubscription = await updateSubscription({
                subscriptionId: stripeSubscriptionId,
                subscriptionItemId: stripeSubscriptionItemId,
                priceId: stripePriceId,
            });
            await db.update(subscriptions).set({
                priceId: newPrice.id,
                status: SubscriptionStatus.ACTIVE,
                updatedAt: new Date(),
            }).where(eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId)).returning();
            return updatedSubscription;
        } else {
            // If the new price is lower, we schedule the change for the end of the current period.
            const schedule = await updateSubscriptionNextPeriod({
                subscriptionId: stripeSubscriptionId,
                priceId: stripePriceId,
            });
            const endDate = schedule.phases[0]?.end_date;
            const scheduledChangeAt = endDate ? new Date(endDate * 1000) : null;

            const [updatedSubscription] = await db.update(subscriptions).set({
                priceId: currentPrice.id,
                updatedAt: new Date(),
                scheduledPriceId: newPrice.id,
                stripeSubscriptionScheduleId: schedule.id,
                scheduledChangeAt,
            }).where(eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId)).returning();
            return updatedSubscription;
        }
    }),

    releaseSubscriptionSchedule: protectedProcedure.input(z.object({
        subscriptionScheduleId: z.string(),
    })).mutation(async ({ input }) => {
        await releaseSubscriptionSchedule({ subscriptionScheduleId: input.subscriptionScheduleId });
        await db.update(subscriptions).set({
            status: SubscriptionStatus.ACTIVE,
            updatedAt: new Date(),
            scheduledPriceId: null,
            stripeSubscriptionScheduleId: null,
            scheduledChangeAt: null,
        }).where(eq(subscriptions.stripeSubscriptionScheduleId, input.subscriptionScheduleId)).returning();
    }),
});

