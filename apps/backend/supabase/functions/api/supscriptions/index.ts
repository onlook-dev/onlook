import { REDIRECT_APP_URL } from '@onlook/models/constants/api.ts';
import Stripe from 'https://esm.sh/stripe?target=deno';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getUser } from "../helpers/auth.ts";

// Create checkout session
export const createCheckoutSession = async (client: SupabaseClient) => {
    try {
        const user = await getUser(client);
        const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{
                price: Deno.env.get('STRIPE_PRO_PRICE_ID') as string,
                quantity: 1,
            }],
            payment_method_types: ['card'],
            success_url: REDIRECT_APP_URL,
            cancel_url: REDIRECT_APP_URL,
            customer_email: user.email,
            metadata: {
                user_id: user.id,
            },
            allow_promotion_codes: true,
        });
        console.log("Checkout session created: ", session)
        return Response.json({ url: session.url }, { status: 200 });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return Response.json({ error: 'Error creating checkout session' }, { status: 500 });
    }
};

// Check subscription status
export const checkSubscription = async (client: SupabaseClient) => {
    try {
        // Query Stripe API to check subscription status
        const { data: userUsage, error } = await client.from('user_usage').select('*').eq('cancelled', false).single()
        if (error) {
            throw new Error(error.message);
        }
        const plan = await client.from('usage_plans').select('*').eq('id', userUsage.plan_id).single();
        console.log("Subscription found: ", plan)
        return Response.json({ data: plan.data }, { status: 200 });
    } catch (error) {
        console.error('Error checking subscription:', error);
        return Response.json({ error: 'Error checking subscription' }, { status: 500 });
    }
};

// Create customer portal session
export const createCustomerPortalSession = async (client: SupabaseClient) => {
    try {
        const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string);

        // Query Stripe API to check subscription status
        const { data: userUsage, error } = await client.from('user_usage').select('*').single()
        if (error) {
            throw new Error(error.message);
        }

        // Create portal session directly with customer ID
        const session = await stripe.billingPortal.sessions.create({
            customer: userUsage.stripe_customer_id,
            return_url: REDIRECT_APP_URL,
        });

        console.log("Portal session created: ", session)
        return Response.json({ url: session.url }, { status: 200 });
    } catch (error) {
        console.error('Error creating portal session:', error);
        return Response.json({ error: 'Error creating portal session' }, { status: 500 });
    }
};
