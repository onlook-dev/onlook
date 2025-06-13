import { env } from "@/env";
import { createClient } from "@/utils/supabase/server";
import { userUsage } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { createStripeClient } from "@onlook/stripe";
import Stripe from "stripe";

export const handleCheckoutSessionCompleted = async (receivedEvent: Stripe.CheckoutSessionCompletedEvent) => {
    // Create Supabase client
    const supabase = await createClient()
    const stripe = createStripeClient(env.STRIPE_SECRET_KEY)
    const session = receivedEvent.data.object

    // Retrieve the session with line items expanded
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

    const { data: plan } = await supabase
        .from('usage_plans')
        .select('*')
        .eq('stripe_price_id', priceId)
        .single()

    if (!plan) {
        throw new Error(`No plan found for price ID: ${priceId}`)
    }

    // Update or create user_usage

    // Use Drizzle instead of Supabase
    const [data] = await db.insert(userUsage).values({
        user_id: session.metadata?.user_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan_id: plan.id,
    }).onConflictDoUpdate({
        target: [userUsage.user_id],
        set: {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
        }
    }).returning()

    // const { data, error } = await supabase
    //     .from('user_usage')
    //     .upsert({
    //         user_id: session.metadata.user_id,
    //         stripe_customer_id: session.customer,
    //         stripe_subscription_id: session.subscription,
    //         plan_id: plan.id,
    //         daily_requests_count: 0,
    //         monthly_requests_count: 0,
    //         cancelled: false,
    //         updated_at: new Date().toISOString(),
    //         last_request_date: new Date().toISOString()
    //     }, {
    //         onConflict: 'user_id'
    //     })
    // 
    // if (error) {
    //     throw new Error(`Error updating user usage: ${error.message}`)
    // }

    console.log("Checkout session completed: ", data)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

export const handleSubscriptionDeleted = async (receivedEvent: any) => {
    // Create Supabase client
    const supabaseClient = await createClient()
    const session = receivedEvent.data.object

    const {
        data: basicPlan
    } = await supabaseClient
        .from('usage_plans')
        .select('*')
        .eq('name', 'basic')
        .single()

    if (!basicPlan) {
        throw new Error('No basic plan found')
    }

    // Update user_usage to remove subscription info
    const res = await supabaseClient
        .from('user_usage')
        .update({
            stripe_customer_id: null,
            stripe_subscription_id: null,
            plan_id: basicPlan.id,
            daily_requests_count: 0,
            monthly_requests_count: 0,
            cancelled: true,
            updated_at: new Date().toISOString(),
            last_request_date: new Date().toISOString()
        })
        .eq('stripe_customer_id', session.customer)

    if (res.error) {
        throw new Error(`Error updating user usage: ${res.error.message}`)
    }

    console.log("Subscription cancelled: ", res)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}