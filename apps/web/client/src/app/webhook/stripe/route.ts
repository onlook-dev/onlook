import { env } from '@/env';
import { createStripeClient } from '@onlook/stripe';
import Stripe from 'stripe';
import { handleSubscriptionCreated, handleSubscriptionDeleted, handleSubscriptionUpdated } from './subscription';

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
        case 'customer.subscription.created': {
            return handleSubscriptionCreated(event);
        }
        case 'customer.subscription.updated': {
            return handleSubscriptionUpdated(event);
        }
        // Fires when the subscription expires, not when the user cancels it
        case 'customer.subscription.deleted': {
            return handleSubscriptionDeleted(event);
        }
        // list of events that could be handled in the future
        case 'customer.subscription.paused':
        case 'customer.subscription.resumed':
        default: {
            return new Response(null, { status: 200 });
        }
    }

}
