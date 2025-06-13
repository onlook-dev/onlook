import { env } from '@/env'
import { createStripeClient } from '@onlook/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: Request) {
    const stripe = createStripeClient(env.STRIPE_SECRET_KEY)
    const endpointSecret = env.STRIPE_WEBHOOK_SECRET

    const buf = Buffer.from(await request.arrayBuffer())
    let event: Stripe.Event

    if (!endpointSecret) {
        return new Response('STRIPE_WEBHOOK_SECRET is not set', { status: 400 })
    }

    const signature = request.headers.get('stripe-signature') as string
    try {
        event = stripe.webhooks.constructEvent(buf, signature, endpointSecret)
    } catch (err: any) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message)
        return new Response('Webhook signature verification failed', { status: 400 })
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            return await handleCheckoutSessionCompleted(event)
        }
        case 'customer.subscription.deleted': {
            return await handleSubscriptionDeleted(event)
        }
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)
            break
        }
        case 'payment_method.attached': {
            const paymentMethod = event.data.object as Stripe.PaymentMethod
            break
        }
        default:
            console.log(`Unhandled event type ${event.type}.`)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

const handleCheckoutSessionCompleted = async (receivedEvent: Stripe.Event) => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const session = receivedEvent.data.object as Stripe.Checkout.Session
    const stripe = createStripeClient(env.STRIPE_SECRET_KEY)

    const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
            expand: ['line_items'],
        }
    )

    const priceId = expandedSession.line_items?.data[0]?.price?.id

    const { data: plan } = await supabase
        .from('usage_plans')
        .select('*')
        .eq('stripe_price_id', priceId)
        .single()

    if (!plan) {
        throw new Error(`No plan found for price ID: ${priceId}`)
    }

    const { data, error } = await supabase
        .from('user_usage')
        .upsert({
            user_id: session.metadata?.user_id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan_id: plan.id,
            daily_requests_count: 0,
            monthly_requests_count: 0,
            cancelled: false,
            updated_at: new Date().toISOString(),
            last_request_date: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })

    if (error) {
        throw new Error(`Error updating user usage: ${error.message}`)
    }

    console.log("Checkout session completed: ", data)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

const handleSubscriptionDeleted = async (receivedEvent: Stripe.Event) => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const subscription = receivedEvent.data.object as Stripe.Subscription

    const { data: basicPlan } = await supabase
        .from('usage_plans')
        .select('*')
        .eq('name', 'basic')
        .single()

    if (!basicPlan) {
        throw new Error('No basic plan found')
    }

    const res = await supabase
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
        .eq('stripe_customer_id', subscription.customer)

    if (res.error) {
        throw new Error(`Error updating user usage: ${res.error.message}`)
    }

    console.log("Subscription cancelled: ", res)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
