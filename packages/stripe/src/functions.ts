import { createStripeClient } from './client';

export const createCustomer = async ({ name, email }: { name: string; email: string }) => {
    const stripe = createStripeClient();
    return await stripe.customers.create({ name, email });
};

export const createMeterEvent = async ({
    eventName,
    value,
    customerId,
}: {
    eventName: string;
    value: number;
    customerId: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.billing.meterEvents.create({
        event_name: eventName,
        payload: {
            value: value.toString(),
            stripe_customer_id: customerId,
        },
    });
};

export const createPrice = async ({
    currency,
    amount,
    meterId,
    productName,
}: {
    currency: string;
    amount: number;
    meterId: string;
    productName: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.prices.create({
        currency,
        unit_amount: amount,
        recurring: {
            interval: 'month',
            meter: meterId,
            usage_type: 'metered',
        },
        product_data: { name: productName },
    });
};

export const createSubscription = async ({
    customerId,
    priceId,
}: {
    customerId: string;
    priceId: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['pending_setup_intent'],
    });
};

export const createCheckoutSession = async ({
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    metadata = {},
}: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
}) => {
    const stripe = createStripeClient();
    return await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: {
            metadata,
        },
        allow_promotion_codes: true,
    });
};

export const createCustomerPortalSession = async ({
    customerId,
    returnUrl,
}: {
    customerId: string;
    returnUrl: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
};

export const cancelSubscription = async (subscriptionId: string) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
    });
};

export const resumeSubscription = async (subscriptionId: string) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
    });
};

export const updateSubscription = async ({
    subscriptionId,
    priceId,
}: {
    subscriptionId: string;
    priceId: string;
}) => {
    const stripe = createStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0].id;
    
    return await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: itemId,
                price: priceId,
            },
        ],
        proration_behavior: 'create_prorations',
    });
};

export const getSubscription = async (subscriptionId: string) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method'],
    });
};

export const getCustomer = async (customerId: string) => {
    const stripe = createStripeClient();
    return await stripe.customers.retrieve(customerId);
};

export const listPrices = async (productId?: string) => {
    const stripe = createStripeClient();
    const params: any = {
        active: true,
        expand: ['data.product'],
    };
    
    if (productId) {
        params.product = productId;
    }
    
    return await stripe.prices.list(params);
};
