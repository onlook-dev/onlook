import { env } from '@/env'
import { createMeterEvent } from '@onlook/stripe'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { eventName, value, customerId } = await request.json()
        
        if (!eventName || !value || !customerId) {
            return new Response('Missing eventName, value, or customerId', { status: 400 })
        }

        const meterEvent = await createMeterEvent({
            eventName,
            value,
            customerId,
        })

        return new Response(JSON.stringify(meterEvent), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error creating meter event:', error)
        return new Response('Internal server error', { status: 500 })
    }
}
