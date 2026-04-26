
-- Create guti_stock table for tracking guti hair stock entries
CREATE TABLE public.guti_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  rate_per_kg NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  factory_id UUID REFERENCES public.factories(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guti_stock ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated read guti_stock" ON public.guti_stock FOR SELECT USING (true);
CREATE POLICY "Users insert guti_stock" ON public.guti_stock FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own guti_stock" ON public.guti_stock FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
