-- Add google_email column to merchants table for storing the verified Google account email
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_email TEXT;
