-- Step 1: Add status column (default 'draft' so existing rows get a value)
ALTER TABLE venue_promotions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'ended'));

-- Step 2: Migrate existing data
UPDATE venue_promotions
  SET status = CASE
    WHEN is_active = true AND valid_until > now() THEN 'active'
    ELSE 'ended'
  END;

-- Step 3: Remove default now that data is migrated
ALTER TABLE venue_promotions ALTER COLUMN status DROP DEFAULT;

-- Step 4: Drop is_active
ALTER TABLE venue_promotions DROP COLUMN IF EXISTS is_active;
