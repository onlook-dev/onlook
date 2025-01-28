-- User usage table. This tracks the usage of a user and their plan.
create table if not exists user_usage (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  daily_requests_count bigint default 0,
  monthly_requests_count bigint default 0,
  plan_id bigint references usage_plans not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  cancelled boolean default false,
  last_request_date date default current_date
);

-- Enable row level security
alter table user_usage enable row level security;
create policy "User can view their own usage" on user_usage for select using (auth.uid() = user_id);
create policy "User can create their own usage" on user_usage for insert with check (
  auth.uid() = user_id AND
  plan_id IN (SELECT id FROM usage_plans WHERE is_free = true)
);

-- Create enum type for usage limit reasons
create type usage_limit_reason as enum ('none', 'daily', 'monthly');

-- Updated function to handle daily and monthly resets
create or replace function check_and_increment_usage(user_id_param uuid)
returns json language plpgsql security definer as $$
declare
    result json;
    user_plan record;
    current_date_val date := current_date;
begin
    -- Get user's current usage and plan limits in one query
    with user_data as (
        select 
            u.daily_requests_count,
            u.monthly_requests_count,
            u.last_request_date,
            p.daily_requests_limit,
            p.monthly_requests_limit,
            u.id as usage_id
        from user_usage u
        join usage_plans p on u.plan_id = p.id
        where u.user_id = user_id_param
        for update -- Lock the row to prevent concurrent updates
    )
    select to_json(ud.*) into result
    from user_data ud;

    -- If no usage record exists, create one with basic plan
    if result is null then
        with new_usage as (
            insert into user_usage (
                user_id, 
                plan_id, 
                daily_requests_count, 
                monthly_requests_count,
                last_request_date
            )
            select 
                user_id_param,
                id,
                1,
                1,
                current_date_val
            from usage_plans
            where name = 'basic'
            returning *
        )
        select json_build_object(
            'exceeded', false,
            'reason', 'none'::usage_limit_reason,
            'daily_requests_count', new_usage.daily_requests_count,
            'monthly_requests_count', new_usage.monthly_requests_count,
            'daily_requests_limit', p.daily_requests_limit,
            'monthly_requests_limit', p.monthly_requests_limit
        ) into result
        from new_usage
        join usage_plans p on p.id = new_usage.plan_id;
        
        return result;
    end if;

    -- Reset counters if needed
    with updated_usage as (
        update user_usage
        set 
            daily_requests_count = case 
                when last_request_date < current_date_val then 0 
                else daily_requests_count 
            end,
            monthly_requests_count = case 
                when extract(month from last_request_date) != extract(month from current_date_val) 
                     or extract(year from last_request_date) != extract(year from current_date_val) then 0 
                else monthly_requests_count 
            end,
            last_request_date = current_date_val
        where user_id = user_id_param
        returning *
    )
    select json_build_object(
        'daily_requests_count', u.daily_requests_count,
        'monthly_requests_count', u.monthly_requests_count,
        'daily_requests_limit', p.daily_requests_limit,
        'monthly_requests_limit', p.monthly_requests_limit
    ) into result
    from updated_usage u
    join usage_plans p on p.id = u.plan_id;

    -- Check limits after potential resets
    if (result->>'daily_requests_count')::bigint >= (result->>'daily_requests_limit')::bigint then
        return json_build_object(
            'exceeded', true,
            'reason', 'daily'::usage_limit_reason,
            'daily_requests_count', (result->>'daily_requests_count')::bigint,
            'monthly_requests_count', (result->>'monthly_requests_count')::bigint,
            'daily_requests_limit', (result->>'daily_requests_limit')::bigint,
            'monthly_requests_limit', (result->>'monthly_requests_limit')::bigint
        );
    end if;

    if (result->>'monthly_requests_count')::bigint >= (result->>'monthly_requests_limit')::bigint then
        return json_build_object(
            'exceeded', true,
            'reason', 'monthly'::usage_limit_reason,
            'daily_requests_count', (result->>'daily_requests_count')::bigint,
            'monthly_requests_count', (result->>'monthly_requests_count')::bigint,
            'daily_requests_limit', (result->>'daily_requests_limit')::bigint,
            'monthly_requests_limit', (result->>'monthly_requests_limit')::bigint
        );
    end if;

    -- Increment counters
    with updated_usage as (
        update user_usage
        set 
            daily_requests_count = daily_requests_count + 1,
            monthly_requests_count = monthly_requests_count + 1,
            updated_at = now()
        where user_id = user_id_param
        returning *
    )
    select json_build_object(
        'exceeded', false,
        'reason', 'none'::usage_limit_reason,
        'daily_requests_count', u.daily_requests_count,
        'monthly_requests_count', u.monthly_requests_count,
        'daily_requests_limit', p.daily_requests_limit,
        'monthly_requests_limit', p.monthly_requests_limit
    ) into result
    from updated_usage u
    join usage_plans p on p.id = u.plan_id;

    return result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function check_and_increment_usage to authenticated;