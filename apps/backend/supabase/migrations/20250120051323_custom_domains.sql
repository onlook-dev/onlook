create table custom_domains (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id),
    domain text not null unique,
    subdomains text array,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table custom_domains enable row level security;

create policy "Users can view own domains"
on custom_domains
for select using (
  auth.uid() = user_id 
);

