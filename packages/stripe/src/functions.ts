import Stripe from 'stripe';
import { createStripeClient } from './client';

export const createCustomer = async ({ name, email }: { name: string; email: string }) => {
    const stripe = createStripeClient();
    return await stripe.customers.create({ name, email });
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
}: {
    subscriptionId: string;
    subscriptionItemId: string;
    priceId: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
        items: [{
            id: subscriptionItemId,
            price: priceId,
        }],
        proration_behavior: 'always_invoice'
    });
}

export const updateSubscriptionNextPeriod = async ({
    subscriptionId,
    priceId,
}: {
    subscriptionId: string;
    priceId: string;
}) => {
    const stripe = createStripeClient();

    // Step 1: Create a subscription schedule from the current subscription
    const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscriptionId,
    });

    const currentPhase = schedule.phases[0];
    if (!currentPhase) {
        throw new Error('No current phase found');
    }
    const currentItem = currentPhase.items[0];
    if (!currentItem) {
        throw new Error('No current item found');
    }

    const currentPrice = currentItem.price.toString();
    if (!currentPrice) {
        throw new Error('No current price found');
    }

    // Step 2: Add a new phase that updates the price starting next billing period
    const updatedSchedule = await stripe.subscriptionSchedules.update(schedule.id, {
        phases: [
            {
                items: [
                    {
                        price: currentPrice,
                        quantity: currentItem.quantity,
                    },
                ],
                start_date: currentPhase.start_date,
                end_date: currentPhase.end_date,
            },
            {
                items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                iterations: 1,
            },
        ],
    });

    return updatedSchedule;
};

export const releaseSubscriptionSchedule = async ({
    subscriptionScheduleId,
}: {
    subscriptionScheduleId: string;
}) => {
    const stripe = createStripeClient();
    return await stripe.subscriptionSchedules.release(subscriptionScheduleId);
}