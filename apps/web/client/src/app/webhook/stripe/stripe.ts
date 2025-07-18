import { prices, subscriptions, type NewSubscription } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { ScheduledSubscriptionAction, SubscriptionStatus } from '@onlook/stripe';
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const handleCheckoutSessionCompleted = async (receivedEvent: Stripe.CheckoutSessionCompletedEvent, stripe: Stripe) => {
    const session = receivedEvent.data.object

    const userId = session.metadata?.user_id
    if (!userId) {
        throw new Error('No user ID found')
    }

    const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
            expand: ['line_items', 'subscription'],
        }
    );

    const priceId = expandedSession.line_items?.data[0]?.price?.id
    if (!priceId) {
        throw new Error('No price ID found')
    }

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, priceId),
    })
    if (!price) {
        throw new Error(`No price found for price ID: ${priceId}`)
    }

    const customerId = session.customer?.toString()
    if (!customerId) {
        throw new Error('No customer ID found')
    }

    const expandedSubscription = await stripe.subscriptions.retrieve(session.subscription as string, {
        expand: ['items'],
    })
    const subscriptionId = expandedSubscription.id
    if (!subscriptionId) {
        throw new Error('No subscription ID found')
    }
    const subscriptionItemId = expandedSubscription.items.data[0]?.id
    if (!subscriptionItemId) {
        throw new Error('No subscription item ID found')
    }

    // Update or create subscription
    const [data] = await db.insert(subscriptions).values({
        userId: userId,
        priceId: price.id,
        productId: price.productId,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionItemId: subscriptionItemId,
    }).onConflictDoUpdate({
        target: [subscriptions.stripeSubscriptionItemId],
        set: {
            priceId: price.id,
            productId: price.productId,
            status: SubscriptionStatus.ACTIVE,
            updatedAt: new Date(),
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionItemId: subscriptionItemId,
        }
    }).returning()

    console.log("Checkout session completed: ", data)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleSubscriptionDeleted = async (receivedEvent: Stripe.CustomerSubscriptionDeletedEvent) => {
    const subscriptionId = receivedEvent.data.object.id
    if (!subscriptionId) {
        throw new Error('No subscription ID found')
    }

    const res = await db.update(subscriptions).set({
        status: SubscriptionStatus.CANCELED,
        endedAt: new Date(),
        scheduledPriceId: null,
        scheduledChangeAt: null,
        stripeSubscriptionScheduleId: null,
    }).where(eq(subscriptions.stripeSubscriptionId, subscriptionId))

    console.log("Subscription cancelled: ", res)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleInvoicePaid = async (receivedEvent: Stripe.InvoicePaidEvent) => {
    const invoice = receivedEvent.data.object
    if (invoice.parent?.type !== 'subscription_details') {
        throw new Error('Invoice is not a subscription details')
    }

    const stripeSubscriptionId = invoice.parent.subscription_details?.subscription.toString()
    if (!stripeSubscriptionId) {
        throw new Error('No subscription ID found')
    }

    const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
    });

    if (!sub) {
        throw new Error('Subscription not found')
    }

    const newPrice = await db.query.prices.findFirst({
        where: eq(prices.id, sub.scheduledPriceId!),
    });

    if (!newPrice) throw new Error('Scheduled price not found');

    // Update the subscription to the new price
    await db.update(subscriptions).set({
        priceId: newPrice.id,
        scheduledPriceId: null,
        scheduledChangeAt: null,
        updatedAt: new Date(),
    }).where(eq(subscriptions.id, sub.id));

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleSubscriptionUpdated = async (receivedEvent: Stripe.CustomerSubscriptionUpdatedEvent) => {
    const stripeSubscription = receivedEvent.data.object
    const stripeSubscriptionId = stripeSubscription.id

    if (!stripeSubscriptionId) {
        throw new Error('No subscription ID found')
    }

    const stripeSubscriptionItemId = stripeSubscription.items.data[0]?.id
    if (!stripeSubscriptionItemId) {
        throw new Error('No subscription item ID found')
    }

    const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionItemId, stripeSubscriptionItemId),
    });

    if (!subscription) {
        throw new Error('Subscription not found')
    }

    const updates: Partial<NewSubscription> = {
        updatedAt: new Date(),
        stripeSubscriptionScheduleId: stripeSubscription.schedule?.toString(),
    }

    const stripePriceId = receivedEvent.data.object.items.data[0]?.price?.id
    if (!stripePriceId) {
        throw new Error('No price ID found')
    }

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, stripePriceId),
    })
    if (!price) {
        throw new Error(`No price found for price ID: ${stripePriceId}`)
    }

    // Update subscription if price changed
    if (price.id !== subscription.priceId) {
        console.log('Price changed from ', subscription.priceId, ' to ', price.id)
        updates.priceId = price.id
        updates.scheduledPriceId = null
        updates.scheduledChangeAt = null
    }

    // Handle scheduled cancellation
    if (stripeSubscription.cancel_at) {
        console.log('Subscription cancellation scheduled at ', stripeSubscription.cancel_at)
        updates.scheduledAction = ScheduledSubscriptionAction.CANCELLATION
        updates.scheduledChangeAt = new Date(stripeSubscription.cancel_at * 1000)
    }

    await db.update(subscriptions).set(updates).where(eq(subscriptions.id, subscription.id));

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}