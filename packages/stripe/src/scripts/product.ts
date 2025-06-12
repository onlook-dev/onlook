import Stripe from 'stripe';
import { createStripeClient } from '../client';

export enum PlanKey {
    PRO = 'pro',
}

export const PLANS: Record<PlanKey, { name: string; tiers: Stripe.PriceCreateParams.Tier[] }> = {
    [PlanKey.PRO]: {
        name: 'Onlook Pro',
        tiers: [
            { up_to: 100, unit_amount: 2000 },
            { up_to: 200, unit_amount: 4000 },
            { up_to: 400, unit_amount: 8000 },
            { up_to: 800, unit_amount: 16000 },
            { up_to: 1200, unit_amount: 24000 },
            { up_to: 'inf', unit_amount: 24000 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
};

export interface ProductSetupResult {
    product: Stripe.Product;
    price: Stripe.Price;
}

/**
 * Clean up existing product and related resources
 */
const cleanupExistingProduct = async (stripe: Stripe, productName: string) => {
    // Find existing product
    const products = await stripe.products.list({ active: true });
    const existingProduct = products.data.find((p) => p.name === productName);

    if (existingProduct) {
        // Find and delete associated prices
        const prices = await stripe.prices.list({ product: existingProduct.id });
        for (const price of prices.data) {
            await stripe.prices.update(price.id, { active: false });
        }

        // Find and delete associated meters
        const meters = await stripe.billing.meters.list();
        for (const meter of meters.data) {
            if (meter.display_name === productName) {
                await stripe.billing.meters.deactivate(meter.id);
            }
        }

        // Delete the product
        await stripe.products.del(existingProduct.id);
    }
};

/**
 * Create a product with a tiered pricing structure.
 */
export const setupProduct = async (): Promise<ProductSetupResult> => {
    const stripe = createStripeClient();
    const productName = PLANS[PlanKey.PRO].name;

    // Clean up any existing product and related resources
    await cleanupExistingProduct(stripe, productName);

    const product = await stripe.products.create({ name: productName });

    const meter = await stripe.billing.meters.create({
        display_name: productName,
        event_name: 'onlook_pro',
        default_aggregation: {
            formula: 'sum',
        },
    });

    const price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        billing_scheme: 'tiered',
        tiers_mode: 'volume',
        recurring: {
            interval: 'month',
            usage_type: 'metered',
            meter: meter.id,
        },
        tiers: PLANS[PlanKey.PRO].tiers,
    });

    return { product, price };
};

if (import.meta.main) {
    setupProduct();
}
