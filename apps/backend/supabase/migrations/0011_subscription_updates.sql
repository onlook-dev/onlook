-- Add stripe customer ID to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS "idx_users_stripe_customer_id" ON "users" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe_subscription_id" ON "subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_plans_stripe_product_id" ON "plans" ("stripe_product_id");
CREATE INDEX IF NOT EXISTS "idx_prices_stripe_price_id" ON "prices" ("stripe_price_id");

-- Add unique constraints
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE ("stripe_customer_id");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id");
ALTER TABLE "plans" ADD CONSTRAINT "plans_stripe_product_id_unique" UNIQUE ("stripe_product_id");
ALTER TABLE "prices" ADD CONSTRAINT "prices_stripe_price_id_unique" UNIQUE ("stripe_price_id");

-- Add RLS policies for subscriptions
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prices" ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON "subscriptions"
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow service role to manage subscriptions
CREATE POLICY "Service role can manage subscriptions" ON "subscriptions"
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to read plans and prices
CREATE POLICY "Authenticated users can view plans" ON "plans"
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view prices" ON "prices"
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to manage plans and prices
CREATE POLICY "Service role can manage plans" ON "plans"
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage prices" ON "prices"
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');