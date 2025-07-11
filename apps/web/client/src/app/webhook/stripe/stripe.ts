import { prices, rateLimits, subscriptions, users, type NewSubscription } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { ScheduledSubscriptionAction } from '@onlook/stripe';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';

function extractIdsFromEvent(
    event:
        | Stripe.CustomerSubscriptionCreatedEvent
        | Stripe.CustomerSubscriptionUpdatedEvent
        | Stripe.CustomerSubscriptionDeletedEvent,
) {
    const stripeSubscription = event.data.object;
    const stripeSubscriptionId = stripeSubscription.id;
    const stripeSubscriptionItemId = stripeSubscription.items.data[0]?.id;
    const stripePriceId = stripeSubscription.items.data[0]?.price?.id;
    const stripeCustomerId = stripeSubscription.customer?.toString();
    const currentPeriodStart = stripeSubscription.items.data[0]?.current_period_start;
    const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end;

    console.log('stripeSubscription.items.data', stripeSubscription.items.data);

    // validation
    if (!stripeSubscriptionId) {
        throw new Error('No subscription ID found');
    }
    if (!stripeSubscriptionItemId) {
        throw new Error('No subscription item ID found');
    }
    if (!stripePriceId) {
        throw new Error('No price ID found');
    }
    if (!currentPeriodStart) {
        throw new Error('No current period start found');
    }
    if (!currentPeriodEnd) {
        throw new Error('No current period end found');
    }
    if (!stripeCustomerId) {
        throw new Error('No customer ID found');
    }

    return {
        stripeSubscription,
        stripeSubscriptionId,
        stripeSubscriptionItemId,
        stripePriceId,
        stripeCustomerId,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    };
}

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
                status: 'active',
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
                    status: 'active',
                },
            })
            .returning();

        if (!data) {
            console.error('[[handleCheckoutSessionCompleted]] No subscription was upserted.');
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

    console.log('Checkout session completed: ', sub, rateLimit);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const handleSubscriptionDeleted = async (
    receivedEvent: Stripe.CustomerSubscriptionDeletedEvent,
) => {
    const { stripeSubscriptionId } = extractIdsFromEvent(receivedEvent);

    const res = await db
        .update(subscriptions)
        .set({
            status: 'canceled',
            endedAt: new Date(),
            scheduledPriceId: null,
            scheduledChangeAt: null,
            stripeSubscriptionScheduleId: null,
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('Subscription cancelled: ', res);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const handleSubscriptionUpdated = async (
    receivedEvent: Stripe.CustomerSubscriptionUpdatedEvent,
) => {
    const {
        stripeSubscriptionItemId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodStart,
        currentPeriodEnd,
    } = extractIdsFromEvent(receivedEvent);
    const stripeSubscription = receivedEvent.data.object;

    const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
    });

    if (!subscription) {
        throw new Error('Subscription not found');
    }

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, stripePriceId),
    });
    if (!price) {
        throw new Error(`No price found for updated price ID: ${stripePriceId}`);
    }

    const currentPriceId = subscription.priceId;
    const currentPrice = await db.query.prices.findFirst({
        where: eq(prices.id, currentPriceId),
    });

    if (!currentPrice) {
        throw new Error(`No price found for current price ID: ${currentPriceId}`);
    }

    const isTierIncrease =
        currentPrice?.id !== price.id &&
        price.monthlyMessageLimit > currentPrice.monthlyMessageLimit;

    let renew = false;
    // Update subscription if price changed
    if (isTierIncrease) {
        await db.transaction(async (tx) => {
            await tx
                .update(subscriptions)
                // this call is solely to update the priceId
                // there is another call below in the case where
                .set({
                    priceId: price.id,
                })
                .where(eq(subscriptions.id, subscription.id));

            // This is important because a subscription may be upgraded to a higher tier without prorating.
            // In the case of a pro-rated tier increase, the system creates a new rate limit with the delta.
            const isProRated =
                isTierIncrease && +currentPeriodEnd === +subscription.stripeCurrentPeriodEnd;
            const tierIncrease = price.monthlyMessageLimit - currentPrice.monthlyMessageLimit;
            if (isProRated) {
                await tx.insert(rateLimits).values({
                    userId: subscription.userId,
                    subscriptionId: subscription.id,
                    max: tierIncrease,
                    left: tierIncrease,
                    startedAt: currentPeriodStart,
                    endedAt: currentPeriodEnd,
                    carryOverKey: uuid(),
                    carryOverTotal: 0,
                    stripeSubscriptionItemId,
                });
            } else {
                // If it is not pro-rated, then it is a completely new period.
                // Therefore, it should behave similarly to a renewal: credits need to be carried over.
                renew = true;
            }
        });
    } else if (
        stripeSubscription.status === 'active' &&
        +currentPeriodEnd !== +subscription.stripeCurrentPeriodEnd
    ) {
        // Based on the doc/dashboard, it is not possible to programmatically update the current period start and end.
        // If it is updated then the subscription is renewed.
        // Creating a new invoice may trigger this block to run; unless the invoice includes an upgrade.
        renew = true;
    }

    if (renew) {
        await db.transaction(async (tx) => {
            // Carry-over the credits from the previous period.
            const rates = await tx.query.rateLimits.findMany({
                where: and(
                    eq(rateLimits.subscriptionId, subscription.id),
                    eq(rateLimits.stripeSubscriptionItemId, subscription.stripeSubscriptionItemId),
                ),
            });

            for (const rate of rates) {
                await tx
                    .update(rateLimits)
                    .set({
                        endedAt: currentPeriodStart,
                    })
                    .where(eq(rateLimits.id, rate.id));

                // Here you can decide the logic for the carry-over.
                // Example, you may want to carry over 100% of the credits on the first carry-over,
                // and 50% of the credits on the next carry-overs.
                // const max = rate.carryOverTotal === 0 ? rate.left : rate.left * 0.50;
                const max = rate.left;

                // For now, we only carry over the credits on the first carry-over.
                // In the future, we may want to carry over the credits on the next carry-overs.
                if (rate.carryOverTotal === 0) {
                    await tx.insert(rateLimits).values({
                        userId: subscription.userId,
                        subscriptionId: subscription.id,
                        max,
                        left: max,
                        startedAt: currentPeriodStart,
                        endedAt: currentPeriodEnd,
                        carryOverKey: rate.carryOverKey,
                        carryOverTotal: rate.carryOverTotal + 1,
                        stripeSubscriptionItemId,
                    });
                }
            }

            // Create a new rate limit for the new period.
            await tx.insert(rateLimits).values({
                userId: subscription.userId,
                subscriptionId: subscription.id,
                max: price.monthlyMessageLimit,
                left: price.monthlyMessageLimit,
                startedAt: currentPeriodStart,
                endedAt: currentPeriodEnd,
                carryOverKey: uuid(),
                carryOverTotal: 0,
                stripeSubscriptionItemId,
            });

            await tx
                .update(subscriptions)
                .set({
                    status: 'active',
                    stripeSubscriptionItemId,
                    stripeCurrentPeriodStart: currentPeriodStart,
                    stripeCurrentPeriodEnd: currentPeriodEnd,
                })
                .where(eq(subscriptions.id, subscription.id));
        });
    }

    if (stripeSubscription.cancel_at) {
        const cancelAt = new Date(stripeSubscription.cancel_at * 1000);
        await db.transaction(async (tx) => {
            await tx
                .update(subscriptions)
                .set({
                    priceId: price.id,
                    scheduledAction: ScheduledSubscriptionAction.CANCELLATION,
                    scheduledChangeAt: cancelAt,
                    stripeSubscriptionItemId,
                })
                .where(eq(subscriptions.id, subscription.id));
        });
        console.log('Subscription cancellation scheduled at ', stripeSubscription.cancel_at);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
