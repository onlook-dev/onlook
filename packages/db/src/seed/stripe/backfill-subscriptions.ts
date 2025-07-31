// Backfill stripe subscriptions with current period start and end

import { subscriptions, type Subscription } from '@/schema/subscription/subscription';
import { db } from '@onlook/db/src/client';
import { createStripeClient } from '@onlook/stripe/src/client';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export const getAllSubscriptions = async (): Promise<Subscription[]> => {
    const subs = await db.select().from(subscriptions);
    return subs;
}

export const getStripeSubscriptionItems = async (stripeSubscriptionItemIds: string[]): Promise<Stripe.SubscriptionItem[]> => {
    const stripe = createStripeClient();
    let stripeSubItems: Stripe.SubscriptionItem[] = [];

    for (const id of stripeSubscriptionItemIds) {
        const subscriptionItem = await stripe.subscriptionItems.retrieve(id);
        stripeSubItems.push(subscriptionItem);
    }
    return stripeSubItems;
}

export const backfillSubscriptions = async () => {
    const subs = await getAllSubscriptions();
    const stripeSubItems = await getStripeSubscriptionItems(subs.map((s) => s.stripeSubscriptionItemId));
    for (const sub of subs) {
        const stripeSubItem = stripeSubItems.find((s) => s.id === sub.stripeSubscriptionItemId);
        if (!stripeSubItem) {
            console.log(`Subscription ${sub.stripeSubscriptionId} not found in Stripe`);
            continue;
        }

        const stripeCurrentPeriodStart = new Date(stripeSubItem.current_period_start * 1000);
        const stripeCurrentPeriodEnd = new Date(stripeSubItem.current_period_end * 1000);

        console.log(stripeCurrentPeriodStart);
        console.log(stripeCurrentPeriodEnd);

        await db.update(subscriptions).set({
            stripeCurrentPeriodStart,
            stripeCurrentPeriodEnd,
        }).where(eq(subscriptions.id, sub.id));
    }
}

(async () => {
    console.log(await getAllSubscriptions());
    process.exit(0);
})();