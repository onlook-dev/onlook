import Stripe from 'stripe';

export const createTestCustomerAndSubscribe = async (stripe: Stripe, price: Stripe.Price) => {
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
