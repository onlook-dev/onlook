-- Usage plans enum
create type usage_plan_values as enum ('basic', 'pro');

-- Different tiers of usage plans
create table if not exists usage_plans (
  id bigint primary key generated always as identity,
  name usage_plan_values not null,
  daily_requests_limit bigint not null,
  monthly_requests_limit bigint not null,
  stripe_price_id text, -- Null for free plan
  stripe_product_id text, -- Null for free plan
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_free boolean not null default false 
);

-- Create tiers of usage plans
insert into usage_plans (
  name, 
  daily_requests_limit, 
  monthly_requests_limit, 
  stripe_price_id, 
  stripe_product_id,
  is_free   
) values
  ('basic', 10, 50, null, null, true),
  ('pro', 1000, 10000, 'price_123456789', 'prod_123456789', false); -- Update these values in dashboard

create policy "Anyone can view usage plans" on usage_plans for select using (true);
