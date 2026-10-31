-- ============================================================
-- Delivery tracking for text messages.
--
-- sms_messages.status says whether Twilio accepted the text ('sent').
-- These columns record what happened next, reported by Twilio to
-- /api/webhooks/twilio-sms/status: queued, sent, delivered,
-- undelivered or failed, plus Twilio's error code (e.g. 30034).
--
-- Safe to run more than once.
-- ============================================================

alter table public.sms_messages add column if not exists delivery_status text;
alter table public.sms_messages add column if not exists error_code int;
alter table public.sms_messages add column if not exists status_updated_at timestamptz;

create index if not exists sms_messages_provider_id on public.sms_messages (provider_id);
