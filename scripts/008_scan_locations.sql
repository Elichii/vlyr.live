-- ============================================================
-- Where and when stickers are scanned (for the Sticker Map)
--
-- * sticker_scans: one row per scan of a sticker (even if the customer
--   doesn't leave a rating), with an approximate location from the network
-- * scans (ratings): optional precise location the customer chose to share
--
-- Safe to run more than once.
-- ============================================================

create table if not exists public.sticker_scans (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  label_id uuid not null references public.label_instances(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  city text,
  region text,
  country text,
  lat double precision,
  lng double precision,
  device text
);

create index if not exists sticker_scans_merchant_idx on public.sticker_scans (merchant_id, scanned_at desc);
create index if not exists sticker_scans_label_idx on public.sticker_scans (label_id, scanned_at desc);

alter table public.sticker_scans enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sticker_scans' and policyname = 'sticker_scans_select_own') then
    create policy "sticker_scans_select_own" on public.sticker_scans
      for select using (auth.uid() = merchant_id);
  end if;
end $$;

-- Location attached to each rating
alter table public.scans add column if not exists lat double precision;
alter table public.scans add column if not exists lng double precision;
alter table public.scans add column if not exists location_accuracy_m integer;
alter table public.scans add column if not exists city text;
alter table public.scans add column if not exists region text;
alter table public.scans add column if not exists country text;
-- 'gps' = customer shared their location, 'network' = approximate
alter table public.scans add column if not exists location_source text;
alter table public.scans add column if not exists device text;
