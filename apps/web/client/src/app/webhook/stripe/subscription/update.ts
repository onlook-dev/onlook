import { trackEvent } from '@/utils/analytics/server';
import { prices, rateLimits, subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import {
    getSubscriptionSchedule,
    isTierUpgrade,
    ScheduledSubscriptionAction,
    SubscriptionStatus,
} from '@onlook/stripe';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import { extractIdsFromEvent } from './helpers';

export const handleSubscriptionUpdated = async (
    receivedEvent: Stripe.CustomerSubscriptionUpdatedEvent,
) => {
    const {
        stripeSubscriptionItemId,
        stripeSubscriptionId,
        stripeSubscriptionScheduleId,
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

    const newPrice = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, stripePriceId),
    });

    if (!newPrice) {
        throw new Error(`No price found for updated price ID: ${stripePriceId}`);
    }

    const currentPriceId = subscription.priceId;
    const currentPrice = await db.query.prices.findFirst({
        where: eq(prices.id, currentPriceId),
    });

    if (!currentPrice) {
        throw new Error(`No price found for current price ID: ${currentPriceId}`);
    }

    const isUpgrade = isTierUpgrade(currentPrice, newPrice);
    const isRenewal =
        stripeSubscription.status === SubscriptionStatus.ACTIVE &&
        +currentPeriodEnd !== +subscription.stripeCurrentPeriodEnd;

    let renew = false;
    // Update subscription if price changed
    if (isUpgrade) {
        renew = await handleSubscriptionUpgrade(
            subscription,
            currentPrice,
            currentPeriodStart,
            currentPeriodEnd,
            stripeSubscriptionItemId,
            newPrice,
            isUpgrade,
        );
    } else if (isRenewal) {
        // Based on the doc/dashboard, it is not possible to programmatically update the current period start and end.
        // If it is updated then the subscription is renewed.
        // Creating a new invoice may trigger this block to run; unless the invoice includes an upgrade.
        renew = true;
    }

    if (renew) {
        await handleSubscriptionRenewed(
            subscription,
            currentPeriodStart,
            currentPeriodEnd,
            stripeSubscriptionItemId,
            newPrice,
        );
    }

    // If the subscription is cancelled, schedule the cancellation in database for display purposes.
    if (stripeSubscription.cancel_at) {
        const cancelAt = new Date(stripeSubscription.cancel_at * 1000);
        await db.transaction(async (tx) => {
            await tx
                .update(subscriptions)
                .set({
                    priceId: newPrice.id,
                    scheduledAction: ScheduledSubscriptionAction.CANCELLATION,
                    scheduledChangeAt: cancelAt,
                    stripeSubscriptionItemId,
                })
                .where(eq(subscriptions.id, subscription.id));
        });
        console.log('Subscription cancellation scheduled at ', stripeSubscription.cancel_at);
    } else {
        await updateSubscriptionScheduleIfNeeded(subscription.id, stripeSubscriptionScheduleId);
    }

    trackEvent({
        distinctId: subscription.userId,
        event: 'user_subscription_updated',
        properties: {
            priceId: newPrice.id,
            productId: newPrice.productId,
            cancellationScheduled: !!stripeSubscription.cancel_at,
            $set: {
                subscription_updated_at: new Date(),
            },
        },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

const handleSubscriptionUpgrade = async (
    subscription: typeof subscriptions.$inferSelect,
    currentPrice: typeof prices.$inferSelect,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    stripeSubscriptionItemId: string,
    newPrice: typeof prices.$inferSelect,
    isUpgrade: boolean,
): Promise<boolean> => {
    let renew = false;
    await db.transaction(async (tx) => {
        await tx
            .update(subscriptions)
            // this call is solely to update the priceId
            // there is another call below in the case where
            .set({
                priceId: newPrice.id,
                // in the case of an upgrade, the downgrade if there is one is unscheduled.
                scheduledAction: null,
                scheduledChangeAt: null,
                scheduledPriceId: null,
                stripeSubscriptionScheduleId: null,
            })
            .where(eq(subscriptions.id, subscription.id));

        // This is important because a subscription may be upgraded to a higher tier without prorating.
        // In the case of a pro-rated tier increase, the system creates a new rate limit with the delta.
        const isProRated = isUpgrade && +currentPeriodEnd === +subscription.stripeCurrentPeriodEnd;
        const tierIncrease = newPrice.monthlyMessageLimit - currentPrice.monthlyMessageLimit;
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
    return renew;
};

const updateSubscriptionScheduleIfNeeded = async (
    subscriptionId: string,
    stripeSubscriptionScheduleId?: string,
) => {
    if (!stripeSubscriptionScheduleId) {
        // If there is no schedule, clear the scheduled action and price change on.
        await db.update(subscriptions).set({
            scheduledAction: null,
            scheduledChangeAt: null,
            scheduledPriceId: null,
            stripeSubscriptionScheduleId: null,
            updatedAt: new Date(),
        }).where(eq(subscriptions.id, subscriptionId));
        return;
    }

    const schedule = await getSubscriptionSchedule({
        subscriptionScheduleId: stripeSubscriptionScheduleId,
    });

    // the phases includes the current phase and the next phases
    // the code does some extra steps of the off chance, it does not include the current
    // phase and the array is not sorted
    const phases = schedule.phases
        // filter out the current phase
        .filter((_) => _.start_date !== schedule.current_phase?.start_date)
        .sort((a, b) => a.start_date - b.start_date);

    const endDate = phases[0]?.start_date;
    const scheduledChangeAt = endDate ? new Date(endDate * 1000) : null;

    const stripePrice = phases[0]?.items[0]?.price;
    const stripePriceId = typeof stripePrice === 'string' ? stripePrice : stripePrice?.id;

    // If the schedule event is not a price change, then it is not handled here.
    if (!stripePriceId) {
        console.log('Stripe Price ID not found.');
        return;
    }

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, stripePriceId),
    });

    if (!price) {
        throw new Error('Price not found.');
    }

    await db
        .update(subscriptions)
        .set({
            updatedAt: new Date(),
            scheduledAction: ScheduledSubscriptionAction.PRICE_CHANGE,
            scheduledPriceId: price.id,
            scheduledChangeAt,
            stripeSubscriptionScheduleId: schedule.id,
        })
        .where(eq(subscriptions.id, subscriptionId))
        .returning();
};

const handleSubscriptionRenewed = async (
    subscription: typeof subscriptions.$inferSelect,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    stripeSubscriptionItemId: string,
    newPrice: typeof prices.$inferSelect,
) => {
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
            max: newPrice.monthlyMessageLimit,
            left: newPrice.monthlyMessageLimit,
            startedAt: currentPeriodStart,
            endedAt: currentPeriodEnd,
            carryOverKey: uuid(),
            carryOverTotal: 0,
            stripeSubscriptionItemId,
        });

        await tx
            .update(subscriptions)
            .set({
                status: SubscriptionStatus.ACTIVE,
                stripeSubscriptionItemId,
                stripeCurrentPeriodStart: currentPeriodStart,
                stripeCurrentPeriodEnd: currentPeriodEnd,
            })
            .where(eq(subscriptions.id, subscription.id));
    });
};
