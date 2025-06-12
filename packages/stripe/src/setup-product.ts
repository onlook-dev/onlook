import Stripe from 'stripe';

export interface ProductSetupResult {
    product: Stripe.Product;
    price: Stripe.Price;
}

/**
 * Create a product with a tiered pricing structure.
 */
export const setupProduct = async (apiKey: string): Promise<ProductSetupResult> => {
    const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });

    const product = await stripe.products.create({ name: 'Usage Tier Plan' });

    const tiers: Stripe.PriceTier[] = [
        { up_to: 1000, unit_amount: 100 },
        { up_to: 2000, unit_amount: 90 },
        { up_to: 3000, unit_amount: 80 },
        { up_to: 4000, unit_amount: 70 },
        { up_to: 5000, unit_amount: 60 },
        { up_to: 6000, unit_amount: 50 },
        { up_to: 7000, unit_amount: 40 },
        { up_to: 8000, unit_amount: 30 },
        { up_to: 9000, unit_amount: 20 },
        { up_to: 10000, unit_amount: 10 },
        { up_to: 'inf', unit_amount: 5 },
    ];

    const price = await stripe.prices.create({
        currency: 'usd',
        product: product.id,
        recurring: { interval: 'month' },
        billing_scheme: 'tiered',
        tiers_mode: 'graduated',
        tiers,
    });

    return { product, price };
};

if (import.meta.main) {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
        console.error('Missing STRIPE_API_KEY env variable');
        process.exit(1);
    }
    setupProduct(apiKey)
        .then((result) => {
            console.log('Product created:', result.product.id);
            console.log('Price created:', result.price.id);
        })
        .catch((err) => {
            console.error('Error setting up product:', err);
            process.exit(1);
        });
}
