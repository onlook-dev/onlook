import type { Price, Product, ScheduledChange, ScheduledSubscriptionAction, Subscription } from '@onlook/stripe';
import type { Price as DbPrice, Product as DbProduct, Subscription as DbSubscription } from '../schema';

export function fromDbSubscription(
    subscription: DbSubscription & {
        product: DbProduct;
        price: DbPrice;
    },
    scheduledPrice: DbPrice | null,
): Subscription {
    return {
        id: subscription.id,
        status: subscription.status,
        startedAt: subscription.startedAt,
        endedAt: subscription.endedAt,
        product: fromDbProduct(subscription.product),
        price: fromDbPrice(subscription.price),
        scheduledChange: fromDbScheduledChange(scheduledPrice, subscription.scheduledAction, subscription.scheduledChangeAt, subscription.stripeSubscriptionScheduleId),

        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionItemId: subscription.stripeSubscriptionItemId,
    };
}

export function fromDbProduct(product: DbProduct): Product {
    return {
        name: product.name,
        type: product.type,
        stripeProductId: product.stripeProductId,
    };
}

export function fromDbPrice(price: DbPrice): Price {
    return {
        id: price.id,
        productId: price.productId,
        monthlyMessageLimit: price.monthlyMessageLimit,
        stripePriceId: price.stripePriceId,
        key: price.key,
    };
}

export function fromDbScheduledChange(
    price: DbPrice | null,
    scheduledAction: ScheduledSubscriptionAction | null,
    scheduledChangeAt: Date | null,
    stripeSubscriptionScheduleId: string | null,
): ScheduledChange | null {

    if (!scheduledAction || !scheduledChangeAt) {
        return null;
    }

    return {
        price: price ? fromDbPrice(price) : null,
        scheduledAction,
        scheduledChangeAt,
        stripeSubscriptionScheduleId,
    };
}