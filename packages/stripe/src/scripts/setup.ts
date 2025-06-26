import { setupProduct } from './product';

if (import.meta.main) {
    console.log('Setting up product...');
    try {
        await setupProduct();
        console.log('Product setup completed successfully!');
    } catch (error) {
        console.error('Error setting up product', error);
    }
}
