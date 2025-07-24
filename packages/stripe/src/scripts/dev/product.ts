import Stripe from 'stripe';
import { createStripeClient } from '../../client';
import { PRO_PRODUCT_CONFIG, PriceKey, type PriceConfig } from '../../constants';
import { createTestCustomerAndSubscribe } from './customer';
import { cleanupExistingProduct } from './reset';

export const getProProductAndPrices = async () => {
    const stripe = createStripeClient();
    const productName = PRO_PRODUCT_CONFIG.name;

    // Find existing product
    const products = await stripe.products.list({ active: true });
    const product = products.data.find((p) => p.name === productName);

    if (!product) {
        throw new Error('Product not found');
    }

    const prices = await stripe.prices.list({ product: product.id, limit: 100 });

    if (!prices.data.length) {
        throw new Error('Prices not found');
    }

    return { product, prices };
};

async function createPrices(
    stripe: Stripe,
    productId: string,
    priceConfig: PriceConfig
) {
    const price = await stripe.prices.create({
        product: productId,
        currency: 'usd',
        unit_amount: priceConfig.cost,
        recurring: {
            usage_type: 'licensed',
            interval: priceConfig.paymentInterval,
        },
        nickname: priceConfig.key,
    })
    return { key: priceConfig.key, price }
}

export const createProProductWithPrices = async (stripe: Stripe) => {
    console.log('Creating product...');
    const product = await stripe.products.create({ name: PRO_PRODUCT_CONFIG.name });
    const priceMap = new Map<PriceKey, Stripe.Price>();
    for (const priceConfig of PRO_PRODUCT_CONFIG.prices) {
        console.log(`Creating price for ${priceConfig.key}...`);
        const { key, price } = await createPrices(stripe, product.id, priceConfig);
        priceMap.set(key, price);
    }
    return { product, priceMap };
};

/**
 * Create a product with a tiered pricing structure.
 */
export const setupProduct = async () => {
    const stripe = createStripeClient();
    const productName = PRO_PRODUCT_CONFIG.name;

    console.log('Cleaning up existing product and related resources');
    // Clean up any existing product and related resources
    await cleanupExistingProduct(stripe, productName);

    const { product, priceMap } = await createProProductWithPrices(stripe);
    const { customer, subscription } = await createTestCustomerAndSubscribe(stripe, priceMap.get(PriceKey.PRO_MONTHLY_TIER_1)!);

    // Upgrade the customer to the next tier
    await stripe.subscriptions.update(subscription.id, {
        items: [{ price: priceMap.get(PriceKey.PRO_MONTHLY_TIER_2)!.id }],
    });

    return { product, priceMap, customer, subscription };
};
