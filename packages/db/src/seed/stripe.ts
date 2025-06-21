import { db } from '@onlook/db/src/client';
import { PriceKey, ProductType } from "@onlook/stripe";
import { getProProductAndPrices } from "@onlook/stripe/src/scripts/product";
import Stripe from "stripe";
import { prices, products } from '../schema';

export const seedStripe = async () => {
    const { product: stripeProduct, prices: stripePrices } = await getProProductAndPrices()

    if (!stripeProduct || !stripePrices) {
        throw new Error('Product or prices not found');
    }

    const [product] = await db.insert(products).values({
        name: stripeProduct.name,
        type: ProductType.PRO,
        stripeProductId: stripeProduct.id,
    }).returning();

    if (!product) throw new Error('Product not found');

    await db.insert(prices).values(stripePrices.data.map((price: Stripe.Price) => {
        const monthlyMessageLimit = price.recurring?.interval_count ?? 0;
        return {
            productId: product.id,
            key: price.nickname as PriceKey,
            monthlyMessageLimit,
            stripePriceId: price.id,
        }
    }))
}