import { config } from 'dotenv';
import Stripe from 'stripe';

// Load .env file
config({ path: '../.env' });

export const createStripeClient = () => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new Error('STRIPE_SECRET_KEY is not set');
    }
    return new Stripe(apiKey, { apiVersion: '2025-05-28.basil' });
};
