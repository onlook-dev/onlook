import { type Price } from '@/schema/subscription/price';
import type { Product } from '@/schema/subscription/product';
import { rateLimits } from '@/schema/subscription/rate-limits';
import { subscriptions, type Subscription } from '@/schema/subscription/subscription';
import { usageRecords } from '@/schema/subscription/usage';
import { users } from '@/schema/user/user';
import { db } from '@onlook/db/src/client';
import { UsageType } from '@onlook/models';
import { SubscriptionStatus } from '@onlook/stripe';
import { createStripeClient } from '@onlook/stripe/src/client';
import { and, asc, count, eq, gte, lt } from 'drizzle-orm';
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
        // where: eq(subscriptions.status, SubscriptionStatus.ACTIVE),
        with: {
            product: true,
            price: true,
        },
        orderBy: asc(subscriptions.startedAt),
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
    if (item.subscription.status !== SubscriptionStatus.ACTIVE) {
        return;
    }

    console.log(`Inserting rate limit for subscription ${item.subscription.id}`);

    // Count usage records within the current period
    const usageCountResult = await tx
        .select({ count: count() })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, item.subscription.userId),
                eq(usageRecords.type, UsageType.MESSAGE),
                gte(usageRecords.timestamp, item.stripeCurrentPeriodStart),
                lt(usageRecords.timestamp, item.stripeCurrentPeriodEnd)
            )
        );

    const usageCount = usageCountResult[0]?.count || 0;
    const remainingUsage = Math.max(0, item.subscription.price.monthlyMessageLimit - usageCount);

    const insertValue = {
        userId: item.subscription.userId,
        subscriptionId: item.subscription.id,
        startedAt: item.stripeCurrentPeriodStart,
        endedAt: item.stripeCurrentPeriodEnd,
        max: item.subscription.price.monthlyMessageLimit,
        left: remainingUsage,
        carryOverKey: uuid(),
        carryOverTotal: 0,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
    }

    console.log(`Inserting rate limit for subscription ${item.subscription.id}: ${JSON.stringify(insertValue, null, 2)}`);

    // Insert rate limit record
    await tx.insert(rateLimits).values(insertValue).onConflictDoNothing();
}

export const backfillSubscriptions = async () => {
    console.log('Backfilling subscriptions...');
    const subs = await getAllSubscriptions();
    console.log(`Found ${subs.length} subscriptions`);
    const stripeItems = await getStripeItems(subs);
    console.log(`Found ${stripeItems.length} stripe items`);

    for (const item of stripeItems) {
        console.log(`Backfilling subscription ${item.subscription.id}`);
        await db.transaction(async (tx) => {
            console.log(`Updating subscription ${item.subscription.id}`);
            // Update subscription
            await tx.update(subscriptions).set({
                stripeCurrentPeriodStart: item.stripeCurrentPeriodStart,
                stripeCurrentPeriodEnd: item.stripeCurrentPeriodEnd,
            }).where(eq(subscriptions.id, item.subscription.id));

            console.log(`Updating user ${item.subscription.userId}`);
            // Update user
            await tx.update(users).set({
                stripeCustomerId: item.stripeCustomerId,
            }).where(eq(users.id, item.subscription.userId))

            console.log(`Inserting rate limit for subscription ${item.subscription.id}`);
            // Insert rate limit based on usage records and subscription price
            await insertRateLimit(tx, item);
            console.log(`Rate limit inserted for subscription ${item.subscription.id}`);
        });
    }
}

(async () => {
    await backfillSubscriptions();
    process.exit(0);
})();