import Stripe from 'stripe';
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
    priceId,
    userId,
    successUrl,
    cancelUrl,
    existing,
}: {
    priceId: string;
    userId: string;
    existing?: {
        subscriptionId: string;
        customerId: string;
    }
    successUrl: string;
    cancelUrl: string;
}) => {
    const stripe = createStripeClient();
    let session: Stripe.Checkout.Session;
    if (existing) {
        session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: existing.customerId,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            payment_method_types: ['card'],
            metadata: {
                user_id: userId,
            },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                proration_behavior: 'create_prorations',
            }
        });
    } else {
        session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            payment_method_types: ['card'],
            metadata: {
                user_id: userId,
            },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
    }
    return session;
};

export const createBillingPortalSession = async ({
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
}

export const updateSubscription = async ({
    subscriptionId,
    subscriptionItemId,
    priceId,
    invoiceNow = false,
}: {
    subscriptionId: string;
    subscriptionItemId: string;
    priceId: string;
    invoiceNow?: boolean;
}) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
        items: [{
            id: subscriptionItemId,
            price: priceId,
        }],
        proration_behavior: invoiceNow ? 'always_invoice' : 'create_prorations',
    });
}