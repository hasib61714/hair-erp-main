-- Drop old buyer_type check constraint that only allowed 'chinese' and 'local'
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_buyer_type_check;

-- Add updated constraint supporting country codes
ALTER TABLE public.sales ADD CONSTRAINT sales_buyer_type_check
  CHECK (buyer_type IN ('BD', 'IN', 'CN', 'OTHER', 'chinese', 'local'));

-- Fix default value
ALTER TABLE public.sales ALTER COLUMN buyer_type SET DEFAULT 'BD';
