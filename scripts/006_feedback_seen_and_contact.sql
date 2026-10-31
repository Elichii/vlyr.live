-- ============================================================
-- New-feedback badges and contact preference
--
-- * merchants.feedback_seen_at: when the manager last opened Customer
--   Feedback (anything newer shows as "new" in the dashboard)
-- * scans.contact_preference: how an unhappy customer wants to be reached
--
-- Safe to run more than once.
-- ============================================================

alter table public.merchants add column if not exists feedback_seen_at timestamptz;
alter table public.scans add column if not exists contact_preference text;
