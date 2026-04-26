
-- Add guti_grade to purchases
ALTER TABLE public.purchases ADD COLUMN guti_grade text DEFAULT '';

-- Add buyer_country to challans
ALTER TABLE public.challans ADD COLUMN buyer_country text NOT NULL DEFAULT 'BD';

-- Update sales buyer_type to support more countries (existing data: "chinese" -> "CN", "local" -> "BD")
UPDATE public.sales SET buyer_type = 'CN' WHERE buyer_type = 'chinese';
UPDATE public.sales SET buyer_type = 'BD' WHERE buyer_type = 'local';
