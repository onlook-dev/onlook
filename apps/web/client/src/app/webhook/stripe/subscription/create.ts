import { trackEvent } from '@/utils/analytics/server';
import { prices, rateLimits, subscriptions, users } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { SubscriptionStatus } from '@onlook/stripe';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import { extractIdsFromEvent } from './helpers';

export const handleSubscriptionCreated = async (
    receivedEvent: Stripe.CustomerSubscriptionCreatedEvent,
) => {
    const {
        stripeSubscriptionId,
        stripeSubscriptionItemId,
        stripePriceId,
        stripeCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
    } = extractIdsFromEvent(receivedEvent);

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, stripePriceId),
    });

    if (!price) {
        throw new Error(`No price found for price ID: ${stripePriceId}`);
    }

    const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, stripeCustomerId),
    });

    if (!user) {
        throw new Error(`No user found for customer ID: ${stripeCustomerId}`);
    }

    // Update or create subscription
    const [sub, rateLimit] = await db.transaction(async (tx) => {
        // If it does not exist then we create it and we create the rate limit.
        // The cases have to be separated because the code would otherwise add additional rate limits.
        const [data] = await tx
            .insert(subscriptions)
            .values({
                userId: user.id,
                priceId: price.id,
                productId: price.productId,
                status: SubscriptionStatus.ACTIVE,
                stripeCustomerId,
                stripeSubscriptionId: stripeSubscriptionId,
                stripeSubscriptionItemId: stripeSubscriptionItemId,
                stripeCurrentPeriodStart: currentPeriodStart,
                stripeCurrentPeriodEnd: currentPeriodEnd,
            })
            .onConflictDoUpdate({
                target: [subscriptions.stripeSubscriptionItemId],
                set: {
                    // Left in case there are concurrent webhook requests for the same subscription
                    userId: user.id,
                    priceId: price.id,
                    productId: price.productId,
                    status: SubscriptionStatus.ACTIVE,
                    stripeCustomerId,
                    stripeSubscriptionId: stripeSubscriptionId,
                    stripeCurrentPeriodStart: currentPeriodStart,
                    stripeCurrentPeriodEnd: currentPeriodEnd,
                },
            })
            .returning();

        if (!data) {
            console.error('[[handleSubscriptionCreated]] No subscription was upserted.');
            throw new Error('No subscription was upserted.');
        }

        const [rateLimit] = await tx
            .insert(rateLimits)
            .values({
                userId: user.id,
                subscriptionId: data.id,
                max: price.monthlyMessageLimit,
                left: price.monthlyMessageLimit,
                startedAt: currentPeriodStart,
                endedAt: currentPeriodEnd,
                carryOverKey: uuid(),
                carryOverTotal: 0,
                stripeSubscriptionItemId,
            })
            .returning();

        return [data, rateLimit];
    });

    trackEvent({
        distinctId: user.id,
        event: 'user_subscription_created',
        properties: {
            priceId: price.id,
            productId: price.productId,
            $set: {
                subscription_created_at: new Date(),
            }
        }
    })

    console.log('Checkout session completed: ', sub, rateLimit);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
