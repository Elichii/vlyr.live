-- ============================================================
-- The person who manages the business on VLYR.
--
-- Collected on the last setup step ("About you") and editable on the
-- Business Profile page. Phone and email use the existing columns
-- merchants.phone and merchants.email.
--
-- Safe to run more than once.
-- ============================================================

alter table public.merchants add column if not exists owner_name text;
alter table public.merchants add column if not exists owner_title text;
