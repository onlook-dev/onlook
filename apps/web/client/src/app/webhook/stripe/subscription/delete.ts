import { trackEvent } from '@/utils/analytics/server';
import { subscriptions, users } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { SubscriptionStatus } from '@onlook/stripe';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { extractIdsFromEvent } from './helpers';

export const handleSubscriptionDeleted = async (
    receivedEvent: Stripe.CustomerSubscriptionDeletedEvent,
) => {
    const { stripeSubscriptionId } = extractIdsFromEvent(receivedEvent);

    const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
    });

    if (!subscription) {
        throw new Error('Subscription not found');
    }

    await db.transaction(async (tx) => {
        const res = await tx
            .update(subscriptions)
            .set({
                status: SubscriptionStatus.CANCELED,
                endedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

        const hasActiveSubscription = await tx.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, subscription.userId),
                eq(subscriptions.status, SubscriptionStatus.ACTIVE)
            ),
        });

        await tx.update(users).set({
            subscriptionActive: !!hasActiveSubscription,
            updatedAt: new Date(),
        }).where(eq(users.id, subscription.userId));

        console.log('Subscription cancelled: ', res);
    });

    await trackSubscriptionCancelled(stripeSubscriptionId);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

const trackSubscriptionCancelled = async (stripeSubscriptionId: string) => {
    try {
        const subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
        });
        if (subscription) {
            trackEvent({
                distinctId: subscription.userId,
                event: 'user_subscription_cancelled',
                properties: {
                    $set: {
                        subscription_cancelled_at: new Date(),
                    }
                }
            })
        }
    } catch (error) {
        console.error('Error tracking user subscription cancelled: ', error)
    }
}
