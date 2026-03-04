-- Add product_type to purchases (guti is default for backward compat)
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'guti';

-- Two by Two stock tracking table
CREATE TABLE public.twobytwo_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  owner_name text NOT NULL,
  product_type text NOT NULL DEFAULT 'two_by_two',
  grade_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_input_kg numeric NOT NULL DEFAULT 0,
  total_output_kg numeric NOT NULL DEFAULT 0,
  chhat_kg numeric NOT NULL DEFAULT 0,
  remand_kg numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.twobytwo_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read twobytwo" ON public.twobytwo_entries FOR SELECT USING (true);
CREATE POLICY "Users insert twobytwo" ON public.twobytwo_entries FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own twobytwo" ON public.twobytwo_entries FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));