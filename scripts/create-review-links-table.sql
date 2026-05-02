-- Create review_links table for multi-platform review links
CREATE TABLE IF NOT EXISTS review_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,           -- 'google', 'yelp', 'facebook', 'tripadvisor', 'custom'
  label TEXT NOT NULL,              -- Display name: "Google Reviews", "Yelp Page", etc.
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by merchant
CREATE INDEX IF NOT EXISTS idx_review_links_merchant ON review_links(merchant_id);

-- Only one primary per merchant (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_links_one_primary
  ON review_links(merchant_id)
  WHERE is_primary = TRUE;

-- RLS policies
ALTER TABLE review_links ENABLE ROW LEVEL SECURITY;

-- Select own
CREATE POLICY review_links_select_own ON review_links
  FOR SELECT USING (merchant_id = auth.uid());

-- Insert own
CREATE POLICY review_links_insert_own ON review_links
  FOR INSERT WITH CHECK (merchant_id = auth.uid());

-- Update own
CREATE POLICY review_links_update_own ON review_links
  FOR UPDATE USING (merchant_id = auth.uid());

-- Delete own
CREATE POLICY review_links_delete_own ON review_links
  FOR DELETE USING (merchant_id = auth.uid());

-- Migrate existing google_review_link data into the new table
INSERT INTO review_links (merchant_id, platform, label, url, is_primary, sort_order)
SELECT id, 'google', 'Google Reviews', google_review_link, TRUE, 0
FROM merchants
WHERE google_review_link IS NOT NULL AND google_review_link != ''
ON CONFLICT DO NOTHING;
