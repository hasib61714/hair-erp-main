
-- Add payment tracking fields to cash_entries
ALTER TABLE public.cash_entries ADD COLUMN person_name text DEFAULT NULL;
ALTER TABLE public.cash_entries ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add bata_rate to purchases for INR conversion tracking
ALTER TABLE public.purchases ADD COLUMN bata_rate numeric DEFAULT NULL;
ALTER TABLE public.purchases ADD COLUMN bdt_paid numeric DEFAULT NULL;
