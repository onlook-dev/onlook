import type { Price, Product, Subscription } from '@onlook/stripe';
import type { Price as DbPrice, Product as DbProduct, Subscription as DbSubscription } from '../schema';

export function toSubscription(subscription: DbSubscription & { product: DbProduct; price: DbPrice }): Subscription {
    return {
        id: subscription.id,
        status: subscription.status,
        startedAt: subscription.startedAt,
        endedAt: subscription.endedAt,
        product: toProduct(subscription.product),
        price: toPrice(subscription.price),
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
    };
}

export function toProduct(product: DbProduct): Product {
    return {
        name: product.name,
        type: product.type,
        stripeProductId: product.stripeProductId,
    };
}

export function toPrice(price: DbPrice): Price {
    return {
        id: price.id,
        productId: price.productId,
        monthlyMessageLimit: price.monthlyMessageLimit,
        stripePriceId: price.stripePriceId,
    };
}