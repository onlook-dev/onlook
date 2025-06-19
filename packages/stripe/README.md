# Stripe Integration

This package provides a comprehensive Stripe integration for managing subscriptions with multiple pricing tiers.

## Features

- **Checkout Sessions**: Create Stripe checkout sessions for subscription purchases
- **Customer Portal**: Allow customers to manage their subscriptions
- **Webhook Handling**: Process Stripe events to keep database in sync
- **Multiple Pricing Tiers**: Support for different pricing plans
- **Subscription Management**: Cancel, resume, and update subscriptions

## Setup

### Environment Variables

Add these to your `.env` file:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Database Migration

Run the migration to add Stripe fields:

```bash
npm run db:migrate
```

## Usage

### Creating a Checkout Session

```typescript
import { api } from '@/trpc/client';

const { data } = await api.subscription.createCheckoutSession.mutate({
  priceId: 'price_xxx',
  successUrl: `${window.location.origin}/success`,
  cancelUrl: `${window.location.origin}/pricing`,
});

// Redirect to Stripe
window.location.href = data.url;
```

### Managing Subscriptions

```typescript
// Get current subscription
const subscription = await api.subscription.get.query();

// Cancel subscription
await api.subscription.cancelSubscription.mutate();

// Resume canceled subscription
await api.subscription.resumeSubscription.mutate();

// Update to different plan
await api.subscription.updateSubscription.mutate({
  priceId: 'price_new_plan',
});

// Open customer portal
const { data } = await api.subscription.createCustomerPortalSession.mutate({
  returnUrl: window.location.href,
});
window.location.href = data.url;
```

### Checking Usage

```typescript
const usage = await api.subscription.getUsage.query();
console.log(`Daily: ${usage.daily.usageCount}/${usage.daily.limitCount}`);
console.log(`Monthly: ${usage.monthly.usageCount}/${usage.monthly.limitCount}`);
```

## Webhook Setup

1. Create a webhook endpoint in Stripe Dashboard pointing to:
   ```
   https://your-domain.com/api/stripe-webhook
   ```

2. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Database Schema

The integration uses these tables:

- **users**: Stores `stripe_customer_id`
- **plans**: Product information with usage limits
- **prices**: Pricing tiers for each plan
- **subscriptions**: Active subscriptions linking users to plans/prices

## API Endpoints

### TRPC Endpoints

- `subscription.get` - Get active subscription
- `subscription.getUsage` - Get usage statistics
- `subscription.createCheckoutSession` - Create checkout session
- `subscription.createCustomerPortalSession` - Create portal session
- `subscription.getAvailablePlans` - List all plans
- `subscription.getAvailablePrices` - List prices for a product
- `subscription.cancelSubscription` - Cancel subscription
- `subscription.resumeSubscription` - Resume canceled subscription
- `subscription.updateSubscription` - Change subscription plan

## Testing

Use Stripe CLI for local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Authentication: `4000 0025 0000 3155`