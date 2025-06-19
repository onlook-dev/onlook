# Stripe Subscription Integration Summary

This implementation provides a complete Stripe subscription management system with multiple pricing tiers.

## Architecture Overview

### 1. **Database Schema** (Already Exists)
- `users` - Has `stripe_customer_id` field
- `plans` - Products with usage limits
- `prices` - Multiple price points per plan  
- `subscriptions` - Links users to active plans/prices

### 2. **Stripe Package** (`packages/stripe`)
- **Client**: Stripe SDK initialization
- **Functions**: 
  - Checkout session creation
  - Customer portal management
  - Subscription CRUD operations
  - Price/product listing
- **Webhook Handler**: Event processing utilities
- **Plans Configuration**: Tiered pricing setup

### 3. **Database Service** (`packages/db/src/services/subscription.ts`)
- Comprehensive subscription queries
- User-customer mapping
- Plan and price management
- Subscription lifecycle operations

### 4. **API Layer** (`apps/web/client/src/server/api/routers/subscription.ts`)
- TRPC endpoints for client access:
  - `createCheckoutSession` - Start subscription purchase
  - `createCustomerPortalSession` - Manage billing
  - `getAvailablePlans` - List pricing options
  - `cancelSubscription` - Cancel at period end
  - `resumeSubscription` - Reactivate canceled
  - `updateSubscription` - Change plans
  - `getUsage` - Check usage limits

### 5. **Webhook Handler** (`apps/web/client/src/app/api/stripe/`)
- Processes Stripe events:
  - `checkout.session.completed` - Creates subscription
  - `customer.subscription.updated` - Syncs changes
  - `customer.subscription.deleted` - Handles cancellation
  - `invoice.payment_failed` - Updates to past_due
  - `invoice.payment_succeeded` - Ensures active status

## Setup Instructions

1. **Environment Variables**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Webhook Configuration**
   - Point Stripe webhook to: `https://your-domain.com/api/stripe`
   - Enable these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`

3. **Initialize Products/Prices**
   - Run the sync script: `npm run stripe:sync-plans`
   - Or manually create in Stripe Dashboard

## Client Usage Example

```typescript
// Start checkout
const { data } = await api.subscription.createCheckoutSession.mutate({
  priceId: 'price_xxx',
  successUrl: `${window.location.origin}/success`,
  cancelUrl: `${window.location.origin}/pricing`
});
window.location.href = data.url;

// Open customer portal
const { data } = await api.subscription.createCustomerPortalSession.mutate({
  returnUrl: window.location.href
});
window.location.href = data.url;

// Check usage
const usage = await api.subscription.getUsage.query();
```

## Key Features

- ✅ Multiple pricing tiers per plan
- ✅ Automatic webhook sync
- ✅ Customer portal integration
- ✅ Usage tracking and limits
- ✅ Subscription lifecycle management
- ✅ Proration on plan changes
- ✅ Failed payment handling
- ✅ RLS policies for security