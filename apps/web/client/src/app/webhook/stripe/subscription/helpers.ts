import Stripe from 'stripe';

export function extractIdsFromEvent(
    event:
        | Stripe.CustomerSubscriptionCreatedEvent
        | Stripe.CustomerSubscriptionUpdatedEvent
        | Stripe.CustomerSubscriptionDeletedEvent,
) {
    const stripeSubscription = event.data.object;
    const stripeSubscriptionId = stripeSubscription.id;
    const stripeSubscriptionItemId = stripeSubscription.items.data[0]?.id;
    const stripeSubscriptionScheduleId =
        typeof stripeSubscription.schedule === 'string'
            ? stripeSubscription.schedule
            : stripeSubscription.schedule?.id;
    const stripePriceId = stripeSubscription.items.data[0]?.price?.id;
    const stripeCustomerId = stripeSubscription.customer?.toString();
    const currentPeriodStart = stripeSubscription.items.data[0]?.current_period_start;
    const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end;

    // validation
    if (!stripeSubscriptionId) {
        throw new Error('No subscription ID found');
    }
    if (!stripeSubscriptionItemId) {
        throw new Error('No subscription item ID found');
    }
    if (!stripePriceId) {
        throw new Error('No price ID found');
    }
    if (!currentPeriodStart) {
        throw new Error('No current period start found');
    }
    if (!currentPeriodEnd) {
        throw new Error('No current period end found');
    }
    if (!stripeCustomerId) {
        throw new Error('No customer ID found');
    }

    return {
        stripeSubscription,
        stripeSubscriptionId,
        stripeSubscriptionItemId,
        stripeSubscriptionScheduleId,
        stripePriceId,
        stripeCustomerId,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    };
}
