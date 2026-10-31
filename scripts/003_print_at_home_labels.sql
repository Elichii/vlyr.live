-- ============================================================
-- Print-at-home QR labels
--
-- Merchants download a PDF of numbered QR labels, print them on
-- sticker paper and cut them out by hand.
--
-- Safe to run more than once. Creates the label tables if they are
-- missing and adds the new columns if the tables already exist.
-- ============================================================

-- 1. Label batches (one row per generated PDF / vendor order)
create table if not exists public.label_batches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  quantity integer not null,
  status text not null default 'pending',
  design_json jsonb,
  provider_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 'self_print' = merchant prints the PDF, 'vendor' = sticker printing company
alter table public.label_batches add column if not exists fulfillment text not null default 'vendor';
alter table public.label_batches add column if not exists first_seq integer;
alter table public.label_batches add column if not exists last_seq integer;
alter table public.label_batches add column if not exists paper text;
alter table public.label_batches add column if not exists ink_saver boolean not null default false;
alter table public.label_batches add column if not exists download_count integer not null default 0;

create index if not exists label_batches_merchant_idx
  on public.label_batches (merchant_id, created_at desc);

-- 2. Label instances (one row per physical sticker)
create table if not exists public.label_instances (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.label_batches(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  short_code text not null unique,
  created_at timestamptz not null default now()
);

-- Running number printed on the sticker (No. 0001, 0002, ...), per merchant
alter table public.label_instances add column if not exists seq integer;
alter table public.label_instances add column if not exists scan_count integer not null default 0;
alter table public.label_instances add column if not exists last_scanned_at timestamptz;

create unique index if not exists label_instances_merchant_seq_idx
  on public.label_instances (merchant_id, seq)
  where seq is not null;

create index if not exists label_instances_batch_idx
  on public.label_instances (batch_id, seq);

-- 3. Link each customer scan to the sticker that was scanned
alter table public.scans add column if not exists label_id uuid
  references public.label_instances(id) on delete set null;

-- 4. Row level security: merchants can read their own labels.
--    Creating labels and recording scans happens on the server.
alter table public.label_batches enable row level security;
alter table public.label_instances enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'label_batches' and policyname = 'label_batches_select_own') then
    create policy "label_batches_select_own" on public.label_batches
      for select using (auth.uid() = merchant_id);
  end if;

  -- The supply shop and onboarding still insert vendor batches from the browser
  if not exists (select 1 from pg_policies where tablename = 'label_batches' and policyname = 'label_batches_insert_own') then
    create policy "label_batches_insert_own" on public.label_batches
      for insert with check (auth.uid() = merchant_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'label_instances' and policyname = 'label_instances_select_own') then
    create policy "label_instances_select_own" on public.label_instances
      for select using (auth.uid() = merchant_id);
  end if;
end $$;
