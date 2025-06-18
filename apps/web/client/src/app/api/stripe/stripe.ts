import { prices, subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const handleCheckoutSessionCompleted = async (receivedEvent: Stripe.CheckoutSessionCompletedEvent, stripe: Stripe) => {
    // Create Supabase client
    const session = receivedEvent.data.object

    // Retrieve the session with line items expanded
    const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
            expand: ['line_items'],
        }
    );

    const subscriptionId = expandedSession.subscription as string
    if (!subscriptionId) {
        throw new Error('No subscription ID found')
    }

    const userId = session.metadata?.user_id
    if (!userId) {
        throw new Error('No user ID found')
    }

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

    // Update or create subscription
    const [data] = await db.insert(subscriptions).values({
        userId: userId,
        priceId: price.id,
        planId: price.planId,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
        startDate: new Date(),
    }).onConflictDoUpdate({
        target: [subscriptions.userId],
        set: {
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            startDate: new Date(),
        }
    }).returning()
    console.log("Checkout session completed: ", data)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleSubscriptionDeleted = async (receivedEvent: Stripe.CustomerSubscriptionDeletedEvent) => {
    // Create Supabase client
    const session = receivedEvent.data.object

    // Update user_usage to remove subscription info
    const res = await db.update(subscriptions).set({
        status: 'canceled',
        endDate: new Date(),
    }).where(eq(subscriptions.stripeSubscriptionId, session.id))

    console.log("Subscription cancelled: ", res)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}