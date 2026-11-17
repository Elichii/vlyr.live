-- ============================================================
-- One-time codes that confirm a customer's phone number.
--
-- When a customer asks to be called or texted after a rating, we text a
-- 6-digit code and only save the number once they type it in.
-- Codes are stored hashed, expire after 10 minutes and allow 5 tries.
-- Only the server reads or writes this table (RLS on, no policies).
--
-- Safe to run more than once.
-- ============================================================

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,                 -- 'customer'
  subject text not null,                 -- who asked (customer's Google email)
  merchant_id uuid references public.merchants(id) on delete cascade,
  phone text not null,                   -- E.164 digits, e.g. 12025550123
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists phone_verifications_subject_created on public.phone_verifications (subject, created_at desc);

alter table public.phone_verifications enable row level security;
