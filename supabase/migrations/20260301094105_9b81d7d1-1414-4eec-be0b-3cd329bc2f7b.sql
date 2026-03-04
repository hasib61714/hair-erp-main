
-- Supplier payments tracking table
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read supplier_payments" ON public.supplier_payments FOR SELECT USING (true);
CREATE POLICY "Users insert supplier_payments" ON public.supplier_payments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own supplier_payments" ON public.supplier_payments FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete supplier_payments" ON public.supplier_payments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
