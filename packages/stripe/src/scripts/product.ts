import { PRO_PRODUCT_CONFIG, ProTier, type TierConfig } from 'src/plans';
import Stripe from 'stripe';
import { createStripeClient } from '../client';

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

            // Delete the product
            console.log('Archiving product', existingProduct.id);
            await stripe.products.update(existingProduct.id, { active: false });
        }
    } catch (error) {
        console.error('Error cleaning up existing product', error);
    }
};

async function createTierPrices(
    stripe: Stripe,
    productId: string,
    tier: TierConfig
): Promise<{ tier: ProTier; monthly: Stripe.Price; yearly: Stripe.Price }> {
    const base = {
        product: productId,
        currency: 'usd',
        recurring: { usage_type: 'licensed' as const },
    }

    const month = stripe.prices.create({
        ...base,
        unit_amount: tier.monthly,
        recurring: { ...base.recurring, interval: 'month' },
        nickname: `${tier.name} – monthly`,
    })

    const year = stripe.prices.create({
        ...base,
        unit_amount: tier.yearly,
        recurring: { ...base.recurring, interval: 'year' },
        nickname: `${tier.name} – yearly`,
    })

    const [monthly, yearly] = await Promise.all([month, year])
    return { tier: tier.name, monthly, yearly }
}

const createFullTestProduct = async (stripe: Stripe) => {
    const product = await stripe.products.create({ name: PRO_PRODUCT_CONFIG.name });
    const priceMap = new Map<ProTier, { monthly: Stripe.Price; yearly: Stripe.Price }>();
    for (const tier of PRO_PRODUCT_CONFIG.tiers) {
        const { tier: tierName, monthly, yearly } = await createTierPrices(stripe, product.id, tier);
        priceMap.set(tierName, { monthly, yearly });
    }
    return { product, priceMap };
};

const createTestCustomerAndSubscribe = async (stripe: Stripe, price: Stripe.Price) => {
    console.log('Creating customer...');
    const customer = await stripe.customers.create({
        email: 'test@test.com',
        name: 'Test Customer',
    });

    console.log('Creating payment method...');
    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
    });

    console.log('Attaching payment method to customer...');
    const attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id,
    });

    console.log('Setting payment method as default...');
    await stripe.customers.update(customer.id, {
        invoice_settings: {
            default_payment_method: paymentMethod.id,
        },
    });

    console.log('Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
        amount: price.unit_amount!,
        currency: 'usd',
        customer: customer.id,
        payment_method: paymentMethod.id,
        confirm: true,
        automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
        },
    });

    console.log('Creating subscription...');
    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        default_payment_method: paymentMethod.id,
    });

    return { customer, subscription };
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

    const { product, priceMap } = await createFullTestProduct(stripe);
    const { customer, subscription } = await createTestCustomerAndSubscribe(stripe, priceMap.get(ProTier.TIER_1)!.monthly);

    // Upgrade the customer to the next tier
    await stripe.subscriptions.update(subscription.id, {
        items: [{ price: priceMap.get(ProTier.TIER_2)!.monthly.id }],
    });

    return { product, priceMap, customer, subscription };
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
