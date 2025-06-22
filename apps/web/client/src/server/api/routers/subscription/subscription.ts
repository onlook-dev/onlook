import { prices, subscriptions, toSubscription } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { createBillingPortalSession, createCheckoutSession, PriceKey, updateSubscription } from '@onlook/stripe';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const subscriptionRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                product: true,
                price: true,
            },
        });

        if (!subscription) {
            console.error('No active subscription found for user', user.id);
            return null;
        }
        return toSubscription(subscription);
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
            successUrl: `${originUrl}/subscription/success`,
            cancelUrl: `${originUrl}/subscription/cancel`,
        });

        return session;
    }),
    manageSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
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
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const updatedSubscription = await updateSubscription({
            subscriptionId: stripeSubscriptionId,
            subscriptionItemId: stripeSubscriptionItemId,
            priceId: stripePriceId,
        });

        const price = await db.query.prices.findFirst({
            where: eq(prices.stripePriceId, stripePriceId),
        });

        if (!price) {
            throw new Error(`Price not found for priceId: ${stripePriceId}`);
        }

        await db.update(subscriptions).set({
            priceId: price.id,
            status: 'active',
            updatedAt: new Date(),
        }).where(eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId)).returning();

        return updatedSubscription;
    }),
});

