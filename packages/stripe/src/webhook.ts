import Stripe from 'stripe';
import { createStripeClient } from './client';

export const constructWebhookEvent = (
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
): Stripe.Event => {
    const stripe = createStripeClient();
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};

export interface WebhookHandlers {
    'checkout.session.completed': (session: Stripe.Checkout.Session) => Promise<void>;
    'customer.subscription.created': (subscription: Stripe.Subscription) => Promise<void>;
    'customer.subscription.updated': (subscription: Stripe.Subscription) => Promise<void>;
    'customer.subscription.deleted': (subscription: Stripe.Subscription) => Promise<void>;
    'invoice.payment_succeeded': (invoice: Stripe.Invoice) => Promise<void>;
    'invoice.payment_failed': (invoice: Stripe.Invoice) => Promise<void>;
}

export const handleWebhookEvent = async (
    event: Stripe.Event,
    handlers: Partial<WebhookHandlers>
): Promise<void> => {
    switch (event.type) {
        case 'checkout.session.completed':
            if (handlers['checkout.session.completed']) {
                await handlers['checkout.session.completed'](event.data.object as Stripe.Checkout.Session);
            }
            break;
        
        case 'customer.subscription.created':
            if (handlers['customer.subscription.created']) {
                await handlers['customer.subscription.created'](event.data.object as Stripe.Subscription);
            }
            break;
        
        case 'customer.subscription.updated':
            if (handlers['customer.subscription.updated']) {
                await handlers['customer.subscription.updated'](event.data.object as Stripe.Subscription);
            }
            break;
        
        case 'customer.subscription.deleted':
            if (handlers['customer.subscription.deleted']) {
                await handlers['customer.subscription.deleted'](event.data.object as Stripe.Subscription);
            }
            break;
        
        case 'invoice.payment_succeeded':
            if (handlers['invoice.payment_succeeded']) {
                await handlers['invoice.payment_succeeded'](event.data.object as Stripe.Invoice);
            }
            break;
        
        case 'invoice.payment_failed':
            if (handlers['invoice.payment_failed']) {
                await handlers['invoice.payment_failed'](event.data.object as Stripe.Invoice);
            }
            break;
        
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
};