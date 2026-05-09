-- Add manual is_paid flag to challans
ALTER TABLE challans ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Add manual is_paid flag to party settlements
ALTER TABLE party_settlements ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Add manual is_paid flag to buyers (for BuyerDueModule)
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
