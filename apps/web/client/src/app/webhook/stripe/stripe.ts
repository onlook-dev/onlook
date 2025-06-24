import { prices, subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const handleCheckoutSessionCompleted = async (receivedEvent: Stripe.CheckoutSessionCompletedEvent, stripe: Stripe) => {
    const session = receivedEvent.data.object

    console.log('Checkout session completed: ', session)

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
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionItemId: subscriptionItemId,
    }).onConflictDoUpdate({
        target: [subscriptions.stripeSubscriptionItemId],
        set: {
            priceId: price.id,
            productId: price.productId,
            status: 'active',
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
        status: 'canceled',
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
}

export const handleSubscriptionUpdated = async (receivedEvent: Stripe.CustomerSubscriptionUpdatedEvent) => {
    const subscriptionId = receivedEvent.data.object.id
    if (!subscriptionId) {
        throw new Error('No subscription ID found')
    }

    const subscriptionItemId = receivedEvent.data.object.items.data[0]?.id
    if (!subscriptionItemId) {
        throw new Error('No subscription item ID found')
    }

    const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionItemId, subscriptionItemId),
    });

    if (!sub) {
        throw new Error('Subscription not found')
    }

    const priceId = receivedEvent.data.object.items.data[0]?.price?.id

    if (!priceId) {
        throw new Error('No price ID found')
    }

    if (priceId !== sub.priceId) {
        // Check for schedule on event
        const subscriptionScheduleId = receivedEvent.data.object.schedule?.toString()

        // Update subscription if price changed
        await db.update(subscriptions).set({
            priceId: priceId,
            updatedAt: new Date(),
            scheduledPriceId: null,
            scheduledChangeAt: null,
            stripeSubscriptionScheduleId: subscriptionScheduleId,
        }).where(eq(subscriptions.id, sub.id));
    }
}