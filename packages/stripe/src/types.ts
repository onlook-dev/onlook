export enum ProductType {
    FREE = 'free',
    PRO = 'pro',
}

export interface Product {
    name: string;
    type: ProductType;
    stripeProductId: string;
}

export interface Price {
    id: string;
    productId: string;
    monthlyMessageLimit: number;
    stripePriceId: string;
}

export interface Subscription {
    id: string;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    product: Product;
    price: Price;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
}
