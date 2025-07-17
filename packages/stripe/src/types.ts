import type { PriceKey } from "./constants";

export enum ProductType {
    FREE = 'free',
    PRO = 'pro',
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    CANCELED = 'canceled',
}

export interface Product {
    name: string;
    type: ProductType;
    stripeProductId: string;
}

export interface Price {
    id: string;
    productId: string;
    key: PriceKey;
    monthlyMessageLimit: number;
    stripePriceId: string;
}

export interface Subscription {
    id: string;
    status: SubscriptionStatus;
    startedAt: Date;
    endedAt: Date | null;
    product: Product;
    price: Price;
    scheduledChange: ScheduledChange | null;

    // Stripe
    stripeSubscriptionId: string;
    stripeSubscriptionItemId: string;
    stripeCustomerId: string;
}

export enum ScheduledSubscriptionAction {
    PRICE_CHANGE = 'price_change',
    CANCELLATION = 'cancellation',
}

export interface ScheduledChange {
    scheduledAction: ScheduledSubscriptionAction;
    scheduledChangeAt: Date;

    // Only present for price changes
    price: Price | null;
    stripeSubscriptionScheduleId: string | null;
}
