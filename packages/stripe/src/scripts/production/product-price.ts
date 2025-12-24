import { createStripeClient } from '../../client';
import { createProProductWithPrices } from '../dev/product';

const createProductionProduct = async () => {
    const stripe = createStripeClient();
    const { product, priceMap } = await createProProductWithPrices(stripe);
    console.log('Product created:', product);
    console.log('Price map:', priceMap);
}

if (import.meta.main) {
    console.log('Setting up product...');
    try {
        await createProductionProduct();
        console.log('Product setup completed successfully!');
    } catch (error) {
        console.error('Error setting up product', error);
    }
}
