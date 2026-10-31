-- ============================================================
-- Follow up on customer feedback
--
-- * Store the customer's phone separately (for Call / Text buttons)
-- * Let managers mark feedback as resolved and keep a private note
--
-- Safe to run more than once.
-- ============================================================

alter table public.scans add column if not exists customer_phone text;
alter table public.scans add column if not exists resolved_at timestamptz;
alter table public.scans add column if not exists manager_note text;

create index if not exists scans_merchant_created_idx
  on public.scans (merchant_id, created_at desc);
