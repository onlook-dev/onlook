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
        subscriptionId: z.string(),
        priceId: z.string(),
    })).mutation(async ({ input }) => {
        const { subscriptionId, priceId } = input;
        const subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const updatedSubscription = await updateSubscription({
            subscriptionId,
            priceId,
        });

        return updatedSubscription;
    }),
});

