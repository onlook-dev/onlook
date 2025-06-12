import { env } from '@/env'
import { createStripeClient } from '@onlook/stripe'
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
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)
            // handlePaymentIntentSucceeded(paymentIntent)
            break
        }
        case 'payment_method.attached': {
            const paymentMethod = event.data.object as Stripe.PaymentMethod
            // handlePaymentMethodAttached(paymentMethod)
            break
        }
        default:
            // Unexpected event type
            console.log(`Unhandled event type ${event.type}.`)
    }

    return new Response(null, { status: 200 })
}
