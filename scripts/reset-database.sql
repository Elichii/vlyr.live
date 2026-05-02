-- Reset database for fresh testing
-- This script deletes all user data while preserving table structures

-- First, delete from tables that have foreign key references
DELETE FROM billing_logs;
DELETE FROM label_instances;
DELETE FROM label_batches;
DELETE FROM orders;
DELETE FROM review_links;
DELETE FROM scans;
DELETE FROM subscriptions;
DELETE FROM merchants;

-- Also clear auth users (this requires service role permissions)
-- Note: This deletes from auth.users which will cascade to merchants via the FK
DELETE FROM auth.users;
