import Stripe from 'stripe';
import { createStripeClient } from './client';
import type { Price } from './types';

export const createCustomer = async ({ name, email }: { name: string; email: string }) => {
    const stripe = createStripeClient();
    return stripe.customers.create({ name, email });
};

export const isTierUpgrade = (currentPrice: Price, newPrice: Price) => {
    return newPrice.monthlyMessageLimit > currentPrice.monthlyMessageLimit;
};

export const createCheckoutSession = async ({
    priceId,
    userId,
    stripeCustomerId,
    successUrl,
    cancelUrl,
    existing,
}: {
    priceId: string;
    userId: string;
    stripeCustomerId: string;
    existing?: {
        subscriptionId: string;
        customerId: string;
    };
    successUrl: string;
    cancelUrl: string;
}) => {
    const stripe = createStripeClient();
    let session: Stripe.Checkout.Session;
    if (existing) {
        session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            payment_method_types: ['card'],
            metadata: {
                user_id: userId,
            },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                proration_behavior: 'create_prorations',
            },
        });
    } else {
        session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
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
};

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
    return stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscriptionItemId,
                price: priceId,
            },
        ],
        proration_behavior: 'always_invoice',
    });
};

export const upgradeSubscription = async ({
    subscriptionId,
    subscriptionItemId,
    priceId,
}: {
    subscriptionId: string;
    subscriptionItemId: string;
    priceId: string;
}) => {
    const stripe = createStripeClient();
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!currentSubscription) {
        throw new Error('Subscription not found');
    }

    const currentPrice = currentSubscription.items.data[0]?.price.id;
    if (currentPrice === priceId) {
        throw new Error('New price is the same as the current price');
    }

    const currentPriceAmount = currentSubscription.items.data[0]?.price.unit_amount;
    if (!currentPriceAmount) {
        throw new Error('Current price amount not found');
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
            {
                id: subscriptionItemId,
                price: priceId,
            },
        ],
        // We don't want to prorate the price difference because it would be based on time remaining in the current period
        proration_behavior: 'none',
    });

    const newPriceAmount = updatedSubscription.items.data[0]?.price.unit_amount;
    if (!newPriceAmount) {
        throw new Error('New price amount not found');
    }

    const priceDifferenceAmount = newPriceAmount - currentPriceAmount;

    // Create a one-off invoice item for the price difference if the new price is higher
    if (priceDifferenceAmount > 0) {
        await stripe.invoiceItems.create({
            customer: updatedSubscription.customer as string,
            amount: priceDifferenceAmount,
            currency: updatedSubscription.currency || 'usd',
            description: 'Price upgrade difference',
        });

        // Create invoice immediately
        const invoice = await stripe.invoices.create({
            customer: updatedSubscription.customer as string,
            auto_advance: true,
        });
    }

    return updatedSubscription;
};


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
};

export const getSubscriptionSchedule = async ({
    subscriptionScheduleId,
}: {
    subscriptionScheduleId: string;
}) => {
    const stripe = createStripeClient();
    return stripe.subscriptionSchedules.retrieve(subscriptionScheduleId);
};
