import Stripe from 'stripe';
import { createStripeClient } from '../client';
import { PLANS, PlanType } from '../plans';

/**
 * Clean up existing product and related resources
 */
const cleanupExistingProduct = async (stripe: Stripe, productName: string) => {
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

            // Find and delete associated meters
            const meters = await stripe.billing.meters.list();
            for (const meter of meters.data) {
                if (meter.display_name === productName) {
                    console.log('Deactivating meter', meter.id);
                    await stripe.billing.meters.deactivate(meter.id);
                }
            }

            // Delete the product
            console.log('Deleting product', existingProduct.id);
            await stripe.products.del(existingProduct.id);
        }
    } catch (error) {
        console.error('Error cleaning up existing product', error);
    }
};

const createFullTestProduct = async (stripe: Stripe, productName: string) => {
    console.log('Creating product...');
    const product = await stripe.products.create({ name: productName });
    console.log('Created product', product);

    console.log('Creating meter...');
    const meter = await stripe.billing.meters.create({
        display_name: productName,
        event_name: 'onlook_pro',
        default_aggregation: {
            formula: 'sum',
        },
    });
    console.log('Created meter', meter);

    console.log('Creating price...');
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
        tiers: PLANS[PlanType.PRO].tiers,
    });
    console.log('Created price', price);

    return { product, price, meter };
};

const createTestCustomerAndSubscribe = async (stripe: Stripe, price: Stripe.Price) => {
    console.log('Creating customer...');
    const customer = await stripe.customers.create({
        email: 'test@test.com',
        name: 'Test Customer',
    });
    console.log('Created customer', customer);

    console.log('Creating payment method...');
    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
    });
    console.log('Created payment method', paymentMethod);

    console.log('Attaching payment method to customer...');
    const attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
    });
    console.log('Attached payment method to customer', attachedPaymentMethod);

    console.log('Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
        amount: 2000,
        currency: 'usd',
        customer: customer.id,
        payment_method: paymentMethod.id,
        confirm: true,
        automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
        },
    });
    console.log('Created payment intent', paymentIntent);

    console.log('Creating subscription...');
    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
    });
    console.log('Created subscription', subscription);

    console.log('Creating meter event...');
    const meterEvent = await stripe.billing.meterEvents.create({
        event_name: 'onlook_pro',
        payload: { value: '1', stripe_customer_id: customer.id },
    });
    console.log('Created meter event', meterEvent);

    return { customer, subscription };
};

/**
 * Create a product with a tiered pricing structure.
 */
export const setupProduct = async () => {
    const stripe = createStripeClient();
    const productName = PLANS[PlanType.PRO].name;

    console.log('Cleaning up existing product and related resources');
    // Clean up any existing product and related resources
    await cleanupExistingProduct(stripe, productName);

    const { product, price, meter } = await createFullTestProduct(stripe, productName);
    const { customer, subscription } = await createTestCustomerAndSubscribe(stripe, price);

    return { product, price, meter, customer, subscription };
};

if (import.meta.main) {
    console.log('Setting up product...');
    try {
        await setupProduct();
        console.log('Product setup completed successfully!');
    } catch (error) {
        console.error('Error setting up product', error);
    }
}
