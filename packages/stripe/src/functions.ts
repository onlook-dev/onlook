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
