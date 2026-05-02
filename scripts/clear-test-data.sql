-- Clear all test data for fresh testing
-- This script removes all user and business data from the database

-- First, delete data from tables that have foreign key dependencies
DELETE FROM scans;
DELETE FROM label_instances;
DELETE FROM label_batches;
DELETE FROM review_links;
DELETE FROM billing_logs;
DELETE FROM orders;
DELETE FROM subscriptions;

-- Finally, delete merchants (the main user/business table)
DELETE FROM merchants;

-- Also clear Supabase Auth users (this requires service role)
-- Note: This will be handled separately via Supabase dashboard or API
