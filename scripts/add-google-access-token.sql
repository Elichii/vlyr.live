-- Add google_access_token column to merchants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'google_access_token'
  ) THEN
    ALTER TABLE merchants ADD COLUMN google_access_token TEXT;
  END IF;
END $$;
