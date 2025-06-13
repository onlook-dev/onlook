import { env } from '@/env'
import { createCustomer } from '@onlook/stripe'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { name, email } = await request.json()
        
        if (!name || !email) {
            return new Response('Missing name or email', { status: 400 })
        }

        const customer = await createCustomer({ name, email })

        return new Response(JSON.stringify(customer), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error creating customer:', error)
        return new Response('Internal server error', { status: 500 })
    }
}
