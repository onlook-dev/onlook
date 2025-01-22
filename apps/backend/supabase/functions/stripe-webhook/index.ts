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
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {

                // Create Supabase client
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                    { global: { headers: { Authorization: request.headers.get('Authorization')! } } }
                )

                const subscription = receivedEvent.data.object

                // Get the price ID from the subscription
                const priceId = subscription.items.data[0].price.id


                console.log("Received priceId from Stripe:", priceId)  // Add this line to debug

                const { data: plan } = await supabaseClient
                    .from('usage_plans')
                    .select('*')
                    .eq('stripe_price_id', priceId)
                    .single()

                console.log(await supabaseClient
                    .from('usage_plans')
                    .select('*')
                    .eq('stripe_price_id', priceId)
                    .single())

                console.log("Plan found: ", plan)

                if (!plan) {
                    throw new Error(`No plan found for price ID: ${priceId}`)
                }

                // Update user_usage
                await supabaseClient
                    .from('user_usage')
                    .upsert({
                        stripe_customer_id: subscription.customer,
                        stripe_subscription_id: subscription.id,
                        plan_id: plan.id,
                        requests_count: 0,
                        last_reset: new Date().toISOString()
                    }, {
                        onConflict: 'stripe_customer_id'
                    })
                console.log('User usage updated')
                break
            }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
})
