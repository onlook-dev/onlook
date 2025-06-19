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

export const handleSubscriptionUpdated = async (receivedEvent: Stripe.CustomerSubscriptionUpdatedEvent, stripe: Stripe) => {
    const subscription = receivedEvent.data.object
    
    // Get the subscription's current price
    const priceId = subscription.items.data[0]?.price?.id
    if (!priceId) {
        throw new Error('No price ID found in subscription')
    }

    const price = await db.query.prices.findFirst({
        where: eq(prices.stripePriceId, priceId),
    })
    if (!price) {
        throw new Error(`No price found for price ID: ${priceId}`)
    }

    // Update subscription status and price/plan if changed
    const endDate = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;
    
    const [updated] = await db.update(subscriptions)
        .set({
            status: subscription.status as any,
            priceId: price.id,
            planId: price.planId,
            endDate: endDate,
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        .returning()
    
    console.log("Subscription updated: ", updated)
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

export const handleInvoicePaymentFailed = async (receivedEvent: Stripe.InvoicePaymentFailedEvent) => {
    const invoice = receivedEvent.data.object
    
    if (invoice.subscription) {
        const subscriptionId = typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription.id;
        
        // Update subscription status to past_due
        await db.update(subscriptions)
            .set({ status: 'past_due' })
            .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        
        console.log("Invoice payment failed for subscription: ", subscriptionId)
    }
    
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleInvoicePaymentSucceeded = async (receivedEvent: Stripe.InvoicePaymentSucceededEvent) => {
    const invoice = receivedEvent.data.object
    
    if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const subscriptionId = typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription.id;
        
        // Ensure subscription is active after successful payment
        await db.update(subscriptions)
            .set({ status: 'active' })
            .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        
        console.log("Invoice payment succeeded for subscription: ", subscriptionId)
    }
    
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}