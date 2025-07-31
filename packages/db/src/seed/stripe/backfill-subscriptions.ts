import { type Price } from '@/schema/subscription/price';
import type { Product } from '@/schema/subscription/product';
import { rateLimits } from '@/schema/subscription/rate-limits';
import { subscriptions, type Subscription } from '@/schema/subscription/subscription';
import { usageRecords } from '@/schema/subscription/usage';
import { users } from '@/schema/user/user';
import { db } from '@onlook/db/src/client';
import { UsageType } from '@onlook/models';
import { createStripeClient } from '@onlook/stripe/src/client';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { v4 as uuid } from 'uuid';

interface StripeItem {
    subscription: DbSubscription,
    stripeSubscriptionItemId: string,
    stripeCustomerId: string,
    stripeCurrentPeriodStart: Date,
    stripeCurrentPeriodEnd: Date,
}

interface DbSubscription extends Subscription {
    product: Product,
    price: Price,
}

export const getAllSubscriptions = async (): Promise<DbSubscription[]> => {
    const subs = (await db.query.subscriptions.findMany({
        with: {
            product: true,
            price: true,
        }
    }));

    return subs;
}

export const getStripeItems = async (subscriptions: DbSubscription[]) => {
    const stripe = createStripeClient();
    const items: StripeItem[] = [];

    for (const sub of subscriptions) {
        const subscriptionItem = await stripe.subscriptionItems.retrieve(sub.stripeSubscriptionItemId);
        const stripeCurrentPeriodStart = new Date(subscriptionItem.current_period_start * 1000);
        const stripeCurrentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

        items.push({
            subscription: sub,
            stripeSubscriptionItemId: sub.stripeSubscriptionItemId,
            stripeCustomerId: stripeSubscription.customer as string,
            stripeCurrentPeriodStart,
            stripeCurrentPeriodEnd,
        });
    }

    return items;
}

const insertRateLimit = async (tx: PgTransaction<any, any, any>, item: StripeItem) => {
    // One month from the start date. NOT SURE IF THIS IS CORRECT.
    const endDate = new Date(item.subscription.startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    console.log(`End date: ${endDate}`);

    // Count usage records within the current period
    const usageCountResult = await tx
        .select({ count: count() })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, item.subscription.userId),
                eq(usageRecords.type, UsageType.MESSAGE),
                gte(usageRecords.timestamp, item.subscription.startedAt),
                lt(usageRecords.timestamp, endDate)
            )
        );

    const usageCount = usageCountResult[0]?.count || 0;
    const remainingUsage = Math.max(0, item.subscription.price.monthlyMessageLimit - usageCount);

    // Insert rate limit record
    await tx.insert(rateLimits).values({
        userId: item.subscription.userId,
        subscriptionId: item.subscription.id,
        startedAt: item.subscription.startedAt,
        endedAt: endDate,
        max: item.subscription.price.monthlyMessageLimit,
        left: remainingUsage,
        carryOverKey: uuid(),
        carryOverTotal: 0,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
    });
}

export const backfillSubscriptions = async () => {
    const subs = await getAllSubscriptions();
    const stripeItems = await getStripeItems(subs);

    for (const item of stripeItems) {
        db.transaction(async (tx: PgTransaction<any, any, any>) => {
            // Update subscription
            await tx.update(subscriptions).set({
                stripeCurrentPeriodStart: item.stripeCurrentPeriodStart,
                stripeCurrentPeriodEnd: item.stripeCurrentPeriodEnd,
            }).where(eq(subscriptions.id, item.subscription.id));

            // Update user
            await tx.update(users).set({
                stripeCustomerId: item.stripeCustomerId,
            }).where(eq(users.id, item.subscription.userId));

            // Insert rate limit based on usage records and subscription price
            await insertRateLimit(tx, item);
        });
    }
}

(async () => {
    await backfillSubscriptions();
    process.exit(0);
})();