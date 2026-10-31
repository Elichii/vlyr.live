-- ============================================================
-- Customer sign-in, one-time stickers and business rewards
--
-- * Customers sign in with Google before rating (we store who rated)
-- * Each sticker can be rated once ("burned" after use)
-- * Each business can offer a one-time reward code with an expiry
--
-- Safe to run more than once.
-- ============================================================

-- 1. One-time stickers
alter table public.label_instances add column if not exists used_at timestamptz;
alter table public.label_instances add column if not exists used_by_email text;

-- 2. Who left each rating
alter table public.scans add column if not exists customer_email text;
alter table public.scans add column if not exists customer_name text;

-- 3. Reward settings per business
alter table public.merchants add column if not exists reward_enabled boolean not null default false;
alter table public.merchants add column if not exists reward_offer text;
alter table public.merchants add column if not exists reward_valid_days integer not null default 7;

-- 4. Reward codes handed to customers
create table if not exists public.reward_coupons (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  label_id uuid references public.label_instances(id) on delete set null,
  code text not null unique,
  offer text not null,
  customer_email text,
  customer_name text,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reward_coupons_merchant_idx
  on public.reward_coupons (merchant_id, created_at desc);
create index if not exists reward_coupons_customer_idx
  on public.reward_coupons (merchant_id, customer_email);

-- Merchants can read their own coupons; creating and redeeming happens on the server
alter table public.reward_coupons enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reward_coupons' and policyname = 'reward_coupons_select_own') then
    create policy "reward_coupons_select_own" on public.reward_coupons
      for select using (auth.uid() = merchant_id);
  end if;
end $$;
