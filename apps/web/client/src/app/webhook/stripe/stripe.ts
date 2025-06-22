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
            expand: ['line_items'],
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

    const subscriptionId = session.subscription?.toString()
    if (!subscriptionId) {
        throw new Error('No subscription ID found')
    }

    const subscriptionItemId = expandedSession.line_items?.data[0]?.id
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

    const subscriptionItemId = receivedEvent.data.object.items.data[0]?.id
    if (!subscriptionItemId) {
        throw new Error('No subscription item ID found')
    }

    const res = await db.update(subscriptions).set({
        status: 'canceled',
        endedAt: new Date(),
    }).where(eq(subscriptions.stripeSubscriptionItemId, subscriptionItemId))

    console.log("Subscription cancelled: ", res)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}