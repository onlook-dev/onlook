import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';

import { subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { SubscriptionStatus } from '@onlook/stripe';

import { trackEvent } from '@/utils/analytics/server';
import { extractIdsFromEvent } from './helpers';

export const handleSubscriptionDeleted = async (
    receivedEvent: Stripe.CustomerSubscriptionDeletedEvent,
) => {
    const { stripeSubscriptionId } = extractIdsFromEvent(receivedEvent);

    const res = await db
        .update(subscriptions)
        .set({
            status: SubscriptionStatus.CANCELED,
            endedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('Subscription cancelled: ', res);
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
                    },
                },
            });
        }
    } catch (error) {
        console.error('Error tracking user subscription cancelled: ', error);
    }
};
