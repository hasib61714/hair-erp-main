-- Add product_type column to inventory table
ALTER TABLE public.inventory 
ADD COLUMN product_type text NOT NULL DEFAULT 'two_by_two';
