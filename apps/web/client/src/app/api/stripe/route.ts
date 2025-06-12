import { env } from '@/env'
import { createStripeClient } from '@onlook/stripe'
import type { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'node:stream/consumers'
import Stripe from 'stripe'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!env.STRIPE_WEBHOOK_SECRET) {
        return res.status(500).end('STRIPE_WEBHOOK_SECRET is not set')
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).end('Method Not Allowed')
    }

    const sig = req.headers['stripe-signature'] as string
    let event: Stripe.Event

    const stripe = createStripeClient(env.STRIPE_SECRET_KEY)
    try {
        const buf = await buffer(req)
        event = stripe.webhooks.constructEvent(buf, sig, env.STRIPE_WEBHOOK_SECRET)
    } catch (err: any) {
        console.error('⚠️  Webhook signature verification failed.', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            console.log(`💰 PaymentIntent ${paymentIntent.id} succeeded for ${paymentIntent.amount}`)
            break
        case 'payment_method.attached':
            const paymentMethod = event.data.object as Stripe.PaymentMethod
            console.log(`🔗 PaymentMethod ${paymentMethod.id} attached.`)
            break
        default:
            console.log(`Unhandled event type ${event.type}`)
    }

    res.status(200).end()
}
