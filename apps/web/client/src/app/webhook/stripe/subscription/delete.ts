import { subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { SubscriptionStatus } from '@onlook/stripe';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
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
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
