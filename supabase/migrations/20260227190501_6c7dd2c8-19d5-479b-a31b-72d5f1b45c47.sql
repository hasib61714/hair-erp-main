
-- Add booking slip fields to transfers
ALTER TABLE public.transfers ADD COLUMN recipient_name text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN recipient_address text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN recipient_phone text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN courier_name text DEFAULT NULL;
