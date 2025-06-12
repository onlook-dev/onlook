import Stripe from 'stripe';

export const createStripeClient = (apiKey: string) => {
    return new Stripe(apiKey, { apiVersion: '2023-10-16' });
};

export * from './setup-product';
