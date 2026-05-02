-- ============================================================
-- VLYR Database Schema
-- merchants, orders, scans tables with RLS
-- ============================================================

-- 1. Merchants table (profile for each auth user)
create table if not exists public.merchants (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  phone text,
  business_name text,
  business_category text,
  logo_url text,
  google_place_id text,
  lat double precision,
  lng double precision,
  package_id text not null default 'growth',
  billing_cycle text not null default 'monthly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.merchants enable row level security;

create policy "merchants_select_own" on public.merchants
  for select using (auth.uid() = id);

create policy "merchants_insert_own" on public.merchants
  for insert with check (auth.uid() = id);

create policy "merchants_update_own" on public.merchants
  for update using (auth.uid() = id);

create policy "merchants_delete_own" on public.merchants
  for delete using (auth.uid() = id);


-- 2. Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  order_type text not null default 'subscription',
  package_id text,
  billing_cycle text,
  sticker_qty integer not null default 0,
  acrylic_stands boolean not null default false,
  safety_decals boolean not null default false,
  shipping_street text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country text default 'US',
  recurring_amount integer not null default 0,
  hardware_amount integer not null default 0,
  total_amount integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders
  for select using (auth.uid() = merchant_id);

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = merchant_id);

create policy "orders_update_own" on public.orders
  for update using (auth.uid() = merchant_id);


-- 3. Scans table (for Pulse Check analytics)
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  rating integer,
  feedback text,
  burn_code text,
  source text default 'qr',
  created_at timestamptz not null default now()
);

alter table public.scans enable row level security;

-- Merchants can read their own scans
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = merchant_id);

-- Anyone can insert scans (customers scanning QR codes, no auth required)
create policy "scans_insert_anon" on public.scans
  for insert with check (true);


-- 4. Auto-create merchant profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.merchants (id, email, username, phone, package_id, billing_cycle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', null),
    coalesce(new.raw_user_meta_data ->> 'phone', null),
    coalesce(new.raw_user_meta_data ->> 'package_id', 'growth'),
    coalesce(new.raw_user_meta_data ->> 'billing_cycle', 'monthly')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
