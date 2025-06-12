import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: '../.env' });

export const createStripeClient = (secretKey?: string) => {
    const apiKey = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new Error('STRIPE_SECRET_KEY is not set');
    }
    return new Stripe(apiKey, { apiVersion: '2025-05-28.basil' });
};
