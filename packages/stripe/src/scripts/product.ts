import Stripe from 'stripe';
import { createStripeClient } from '../client';

export interface ProductSetupResult {
    product: Stripe.Product;
    price: Stripe.Price;
}

/**
 * Create a product with a tiered pricing structure.
 */
export const setupProduct = async (): Promise<ProductSetupResult> => {
    const stripe = createStripeClient();

    const product = await stripe.products.create({ name: 'Usage Tier Plan' });

    const price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        billing_scheme: 'tiered',
        tiers_mode: 'graduated',
        recurring: {
            interval: 'month',
            usage_type: 'metered',
        },
        tiers: [
            { up_to: 100, unit_amount: 20 },
            { up_to: 200, unit_amount: 20 },
            { up_to: 400, unit_amount: 20 },
            { up_to: 800, unit_amount: 20 },
            { up_to: 1200, unit_amount: 20 },
            { up_to: 'inf', unit_amount: 20 },
        ],
    });

    return { product, price };
};

if (import.meta.main) {
    setupProduct();
}
