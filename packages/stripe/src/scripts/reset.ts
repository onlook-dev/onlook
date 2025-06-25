import Stripe from 'stripe';

/**
 * Clean up existing product and related resources
 */
export const cleanupExistingProduct = async (stripe: Stripe, productName: string) => {
    try {
        // Find existing product
        const products = await stripe.products.list({ active: true });
        const existingProduct = products.data.find((p) => p.name === productName);

        if (existingProduct) {
            console.log('Found existing product', existingProduct.id);
            // Find and delete associated prices
            const prices = await stripe.prices.list({ product: existingProduct.id });
            for (const price of prices.data) {
                if (price.product === existingProduct.id) {
                    console.log('Deactivating price', price.id);
                    await stripe.prices.update(price.id, { active: false });
                }
            }

            // Delete the product
            console.log('Archiving product', existingProduct.id);
            await stripe.products.update(existingProduct.id, { active: false });
        }
    } catch (error) {
        console.error('Error cleaning up existing product', error);
    }
};
