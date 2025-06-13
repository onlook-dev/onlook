import { env } from '@/env'
import { createStripeClient } from '@onlook/stripe'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { priceId, userId } = await request.json()
        
        if (!priceId || !userId) {
            return new Response('Missing priceId or userId', { status: 400 })
        }

        const stripe = createStripeClient(env.STRIPE_SECRET_KEY)

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${env.NEXT_PUBLIC_SITE_URL}/pricing?success=true`,
            cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
            metadata: {
                user_id: userId,
            },
        })

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return new Response('Internal server error', { status: 500 })
    }
}
