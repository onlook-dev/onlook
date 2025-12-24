import { db } from '@onlook/db/src/client';
import { PriceKey, PRO_PRODUCT_CONFIG, ProductType } from "@onlook/stripe";
import { getProProductAndPrices } from "@onlook/stripe/src/scripts/dev/product";
import { config } from 'dotenv';
import Stripe from "stripe";
import { prices, products } from '../../schema';

// Load .env file
config({ path: '../../.env' });

export const seedStripe = async () => {
    console.log('Getting product and prices...');
    const { product: stripeProduct, prices: stripePrices } = await getProProductAndPrices()

    if (!stripeProduct) {
        console.log('Product not found');
        throw new Error('Product not found');
    }

    if (!stripePrices.data.length) {
        console.log('Prices not found');
        throw new Error('Prices not found');
    }

    console.log('Inserting product...');
    const [product] = await db.insert(products).values({
        name: stripeProduct.name,
        type: ProductType.PRO,
        stripeProductId: stripeProduct.id,
    }).returning();

    if (!product) throw new Error('Product failed to insert');

    console.log('Inserting prices...');
    await db.insert(prices).values(stripePrices.data.map((price: Stripe.Price) => {
        const key = price.nickname as PriceKey;

        const priceConfig = PRO_PRODUCT_CONFIG.prices.find(p => p.key === key);
        if (!priceConfig) throw new Error(`Price config not found for ${key}`);

        const monthlyMessageLimit = priceConfig.monthlyMessageLimit;

        return {
            productId: product.id,
            key: price.nickname as PriceKey,
            monthlyMessageLimit,
            stripePriceId: price.id,
        }
    }))
}

(async () => {
    try {
        if (!process.env.SUPABASE_DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const missingVars: string[] = [];
            if (!process.env.SUPABASE_DATABASE_URL) missingVars.push('SUPABASE_DATABASE_URL');
            if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }

        console.log('Seeding stripe...');
        await seedStripe();
        console.log('Stripe seeded!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();