import { Routes } from '@/utils/constants';
import { legacySubscriptions, prices, subscriptions, toSubscription, users } from '@onlook/db';
import { createBillingPortalSession, createCheckoutSession, createCustomer, isTierUpgrade, PriceKey, releaseSubscriptionSchedule, SubscriptionStatus, updateSubscription, updateSubscriptionNextPeriod } from '@onlook/stripe';
import { and, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const subscriptionRouter = createTRPCRouter({
    getLegacySubscriptions: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await ctx.db.query.legacySubscriptions.findFirst({
            where: and(
                eq(legacySubscriptions.email, user.email),
                isNull(legacySubscriptions.redeemAt),
            ),
        });
        return subscription ?? null;
    }),
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await ctx.db.query.subscriptions.findFirst({
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
            console.log('No active subscription found for user', user.id);
            return null;
        }

        // If there is a scheduled price, we need to fetch it from the database.
        let scheduledPrice = null;
        if (subscription.scheduledPriceId) {
            scheduledPrice = await ctx.db.query.prices.findFirst({
                where: eq(prices.id, subscription.scheduledPriceId),
            }) ?? null;
        }

        return toSubscription(subscription, scheduledPrice);
    }),
    getPriceId: protectedProcedure.input(z.object({
        priceKey: z.nativeEnum(PriceKey),
    })).mutation(async ({ input, ctx }) => {
        const price = await ctx.db.query.prices.findFirst({
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
        const userData = await ctx.db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!userData) {
            throw new Error('User not found');
        }

        let stripeCustomerId = userData?.stripeCustomerId;
        if (!stripeCustomerId) {
            // Store Stripe's customer ID as it is available in all customer-related events and
            // API requests.
            // Important, it may seem like a good idea to check if the customer already exists
            // by looking up the email in Stripe, however, this can be a security risk since
            // a user may sign up with an email that is not their own.
            // This may happen when a user changes their email address in the app and the email
            // is not updated in Stripe.
            const customer = await createCustomer({
                name: (userData.firstName
                    ? userData.firstName + ' ' + userData.lastName
                    : userData.displayName) || "",
                email: user.email ?? userData.email,
            });

            await ctx.db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id));
            stripeCustomerId = customer.id;
        }

        const session = await createCheckoutSession({
            priceId: input.priceId,
            userId: user.id,
            stripeCustomerId,
            successUrl: `${originUrl}${Routes.CALLBACK_STRIPE_SUCCESS}`,
            cancelUrl: `${originUrl}${Routes.CALLBACK_STRIPE_CANCEL}`,
        });

        return session;
    }),
    manageSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await ctx.db.query.subscriptions.findFirst({
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
    })).mutation(async ({ input, ctx }) => {
        const { stripeSubscriptionId, stripeSubscriptionItemId, stripePriceId } = input;
        const subscription = await ctx.db.query.subscriptions.findFirst({
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
        const newPrice = await ctx.db.query.prices.findFirst({
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

        const isUpgrade = isTierUpgrade(currentPrice, newPrice);
        if (isUpgrade) {
            // If the new price is higher, we invoice the customer immediately.
            await updateSubscription({
                subscriptionId: stripeSubscriptionId,
                subscriptionItemId: stripeSubscriptionItemId,
                priceId: stripePriceId,
            });
        } else {
            // If the new price is lower, we schedule the change for the end of the current period.
            const schedule = await updateSubscriptionNextPeriod({
                subscriptionId: stripeSubscriptionId,
                priceId: stripePriceId,
            });
            const endDate = schedule.phases[0]?.end_date;
            const scheduledChangeAt = endDate ? new Date(endDate * 1000) : null;

            await ctx.db.update(subscriptions).set({
                updatedAt: new Date(),
                scheduledChangeAt,
                scheduledPriceId: newPrice.id,
                stripeSubscriptionScheduleId: schedule.id,
            }).where(eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId)).returning();
        }
    }),

    releaseSubscriptionSchedule: protectedProcedure.input(z.object({
        subscriptionScheduleId: z.string(),
    })).mutation(async ({ input, ctx }) => {
        try {
            await releaseSubscriptionSchedule({ subscriptionScheduleId: input.subscriptionScheduleId });
        } catch (error: any) {
            // If the schedule is already released then the code should update the subscription to reflect that.
            // This case is supposed to be handled in the webhook but was implemented here just in case.
            if (!error.toString().includes("You cannot release a subscription schedule that is currently in the `released` status.")) {
                throw error;
            }
        }

        const [updatedSubscription] = await ctx.db.update(subscriptions).set({
            status: SubscriptionStatus.ACTIVE,
            updatedAt: new Date(),
            scheduledPriceId: null,
            stripeSubscriptionScheduleId: null,
            scheduledChangeAt: null,
        }).where(eq(subscriptions.stripeSubscriptionScheduleId, input.subscriptionScheduleId)).returning();

        if (!updatedSubscription) {
            throw new Error('Subscription not found');
        }

        return updatedSubscription;
    }),
});

