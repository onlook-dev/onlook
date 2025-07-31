// Backfill stripe subscriptions with current period start and end

import { subscriptions, type Subscription } from '@/schema/subscription/subscription';
import { users } from '@/schema/user/user';
import { db } from '@onlook/db/src/client';
import { createStripeClient } from '@onlook/stripe/src/client';
import { eq } from 'drizzle-orm';

export const getAllSubscriptions = async (): Promise<Subscription[]> => {
    const subs = await db.select().from(subscriptions);
    return subs;
}

export const getStripeItems = async (subscriptions: Subscription[]) => {
    const stripe = createStripeClient();
    const items: {
        userId: string,
        subscriptionId: string,
        stripeSubscriptionItemId: string,
        stripeCustomerId: string,
        stripeCurrentPeriodStart: Date,
        stripeCurrentPeriodEnd: Date,
    }[] = [];

    for (const sub of subscriptions) {
        const subscriptionItem = await stripe.subscriptionItems.retrieve(sub.stripeSubscriptionItemId);
        const stripeCurrentPeriodStart = new Date(subscriptionItem.current_period_start * 1000);
        const stripeCurrentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

        items.push({
            userId: sub.userId,
            subscriptionId: sub.id,
            stripeSubscriptionItemId: sub.stripeSubscriptionItemId,
            stripeCustomerId: stripeSubscription.customer as string,
            stripeCurrentPeriodStart,
            stripeCurrentPeriodEnd,
        });
    }

    return items;
}

export const backfillSubscriptions = async () => {
    const subs = await getAllSubscriptions();
    const stripeItems = await getStripeItems(subs);

    for (const item of stripeItems) {
        db.transaction(async (tx) => {
            // Update subscription
            await tx.update(subscriptions).set({
                stripeCurrentPeriodStart: item.stripeCurrentPeriodStart,
                stripeCurrentPeriodEnd: item.stripeCurrentPeriodEnd,
            }).where(eq(subscriptions.id, item.subscriptionId));

            // Update user
            await tx.update(users).set({
                stripeCustomerId: item.stripeCustomerId,
            }).where(eq(users.id, item.userId));
        });
    }
}

(async () => {
    await backfillSubscriptions();
    process.exit(0);
})();