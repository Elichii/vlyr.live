-- ============================================================
-- Text alerts for business managers (sent through Twilio)
--
-- sms_alert_settings: the phone each business confirmed for alerts.
--   A number is only used after the manager types in the code we texted
--   to it (proof of consent). Only the server can read or write this
--   table: RLS is on and there are no policies for browsers.
-- sms_messages: every text we try to send (for rate limits and support).
--
-- Safe to run more than once.
-- ============================================================

create table if not exists public.sms_alert_settings (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  phone text,                       -- confirmed number, E.164 digits (e.g. 12025550123)
  enabled boolean not null default false,
  verified_at timestamptz,
  pending_phone text,               -- number waiting for its code
  code_hash text,
  code_expires_at timestamptz,
  code_attempts int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.sms_alert_settings enable row level security;

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  to_phone text not null,
  kind text not null,               -- 'verify' | 'alert' | 'test'
  scan_id uuid,
  status text not null,             -- 'sent' | 'failed' | 'dry_run'
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists sms_messages_merchant_created on public.sms_messages (merchant_id, created_at desc);
-- At most one alert per rating, even if the request is retried
create unique index if not exists sms_messages_one_alert_per_scan on public.sms_messages (scan_id) where kind = 'alert' and status = 'sent';

alter table public.sms_messages enable row level security;
