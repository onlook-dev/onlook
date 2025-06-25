import { env } from '@/env';
import { createStripeClient } from '@onlook/stripe';
import Stripe from 'stripe';
import { handleCheckoutSessionCompleted, handleInvoicePaid, handleSubscriptionDeleted, handleSubscriptionUpdated } from './stripe';

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
            return await handleCheckoutSessionCompleted(event, stripe);
        }
        case 'customer.subscription.updated': {
            return await handleSubscriptionUpdated(event);
        }
        case 'invoice.paid': {
            return await handleInvoicePaid(event);
        }
        // Fires when the subscription expires, not when the user cancels it
        case 'customer.subscription.deleted': {
            return await handleSubscriptionDeleted(event);
        }
        default: {
            return new Response(null, { status: 200 })
        }
    }

}
