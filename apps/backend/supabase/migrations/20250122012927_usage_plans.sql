-- Stripe wrapper
create extension if not exists wrappers with schema extensions;

create foreign data wrapper stripe_wrapper
  handler stripe_fdw_handler
  validator stripe_fdw_validator;

-- Vault method
-- create server stripe_server
--   foreign data wrapper stripe_wrapper
--   options (
--     api_key_id '<key_ID>' -- Stripe API key stored in vault
--   );

-- TODO: Use the above method in production
create server stripe_server
  foreign data wrapper stripe_wrapper
  options (
    api_key 'sk_test_51OUEDcCrXZplPvVXI4z3PImacoBzBt3SZeGaWdaG3aiWSEQdqinBDLN8BEazqx873DfXFSOERQyJtKQ0YDbRLHRP00KKktSWPP'  -- Stripe API key, required
  );

create schema if not exists stripe;

create foreign table stripe.prices (
  id text,
  active bool,
  currency text,
  product text,
  unit_amount bigint,
  type text,
  created timestamp,
  attrs jsonb
)
  server stripe_server
  options (
    object 'prices',
    readonly 'true'
  );

create foreign table stripe.products (
  id text,
  name text,
  active bool,
  default_price text,
  description text,
  created timestamp,
  updated timestamp,
  attrs jsonb
)
  server stripe_server
  options (
    object 'products',
    rowid_column 'id',
    readonly 'true'
  );

create foreign table stripe.customers (
  id text,
  email text,
  name text,
  description text,
  created timestamp,
  attrs jsonb
)
  server stripe_server
  options (
    object 'customers',
    rowid_column 'id',
    readonly 'true'
  );


-- Different tiers of usage plans
create table if not exists usage_plans (
  id bigint primary key generated always as identity,
  name text not null,
  daily_requests_limit bigint not null,
  monthly_requests_limit bigint not null,
  stripe_price_id text, -- Null for free plan
  stripe_product_id text, -- Null for free plan
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_free boolean not null default false 
);

-- User usage table
create table if not exists user_usage (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  requests_count bigint default 0,
  last_reset timestamp with time zone default now(),
  plan_id bigint references usage_plans not null,
  created_at timestamp with time zone default now()
);

-- Insert the usage plans
insert into usage_plans (
  name, 
  daily_requests_limit, 
  monthly_requests_limit, 
  stripe_price_id, 
  stripe_product_id,
  is_free   
) values
  ('basic', 10, 50, null, null, true),
  ('pro', 1000, 10000, null, null, false); 

-- Restrict access
alter table user_usage enable row level security;

create policy "User can view their own usage" on user_usage for select using (auth.uid() = user_id);
