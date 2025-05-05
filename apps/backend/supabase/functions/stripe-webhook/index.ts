import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe?target=deno';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
    // This is needed to use the Fetch API rather than relying on the Node http package.
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})
// This is needed in order to use the Web Crypto API in Deno.
const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (request) => {
    try {
        const signature = request.headers.get('Stripe-Signature')
        const body = await request.text()
        const receivedEvent = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
            undefined,
            cryptoProvider
        )

        switch (receivedEvent.type) {
            case 'checkout.session.completed': {
                return await handleCheckoutSessionCompleted(receivedEvent);
            }
            // Handle cancellation
            case 'customer.subscription.deleted': {
                return await handleSubscriptionDeleted(receivedEvent);
            }
            default: {
                return new Response(JSON.stringify({ ok: true }), { status: 200 })
            }
        }
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
})

const handleCheckoutSessionCompleted = async (receivedEvent: any) => {
    // Create Supabase client
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const session = receivedEvent.data.object

    // Retrieve the session with line items expanded
    const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
            expand: ['line_items'],
        }
    );

    const priceId = expandedSession.line_items?.data[0].price.id

    const { data: plan } = await supabase
        .from('usage_plans')
        .select('*')
        .eq('stripe_price_id', priceId)
        .single()

    if (!plan) {
        throw new Error(`No plan found for price ID: ${priceId}`)
    }

    // Update or create user_usage
    const { data, error } = await supabase
        .from('user_usage')
        .upsert({
            user_id: session.metadata.user_id,
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

const handleSubscriptionDeleted = async (receivedEvent: any) => {
    // Create Supabase client
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

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