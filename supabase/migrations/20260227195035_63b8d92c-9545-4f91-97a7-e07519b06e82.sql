
-- 1. Auto-numbering counters table
CREATE TABLE public.counters (
  id text PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT ''
);
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read counters" ON public.counters FOR SELECT USING (true);
CREATE POLICY "Authenticated can update counters" ON public.counters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert counters" ON public.counters FOR INSERT TO authenticated WITH CHECK (true);

-- Seed initial counters
INSERT INTO public.counters (id, last_number, prefix) VALUES
  ('challan', 0, 'CH-'),
  ('booking_slip', 0, 'BS-');

-- Function to get next number atomically
CREATE OR REPLACE FUNCTION public.get_next_number(counter_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val integer;
  pfx text;
BEGIN
  UPDATE public.counters 
  SET last_number = last_number + 1 
  WHERE id = counter_id 
  RETURNING last_number, prefix INTO next_val, pfx;
  
  IF next_val IS NULL THEN
    INSERT INTO public.counters (id, last_number, prefix) 
    VALUES (counter_id, 1, '')
    RETURNING last_number, prefix INTO next_val, pfx;
  END IF;
  
  RETURN pfx || LPAD(next_val::text, 4, '0');
END;
$$;

-- 2. Role permissions table (admin controls edit/delete per role per module)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module text NOT NULL,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE(role, module)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Seed default permissions: admin gets everything, others get edit only
INSERT INTO public.role_permissions (role, module, can_edit, can_delete) VALUES
  ('admin', 'purchase', true, true), ('admin', 'factories', true, true), ('admin', 'transfers', true, true),
  ('admin', 'production', true, true), ('admin', 'inventory', true, true), ('admin', 'twobytwo_stock', true, true),
  ('admin', 'guti_stock', true, true), ('admin', 'sales', true, true), ('admin', 'party', true, true),
  ('admin', 'cash', true, true), ('admin', 'challan', true, true), ('admin', 'analytics', true, true),
  ('factory_manager', 'factories', true, false), ('factory_manager', 'transfers', true, false),
  ('factory_manager', 'production', true, false), ('factory_manager', 'inventory', true, false),
  ('factory_manager', 'twobytwo_stock', true, false), ('factory_manager', 'guti_stock', true, false),
  ('factory_manager', 'challan', true, false),
  ('accountant', 'purchase', true, false), ('accountant', 'sales', true, false),
  ('accountant', 'cash', true, false), ('accountant', 'challan', true, false);

-- 3. Add DELETE RLS policies to all data tables (admin only by default, others via app logic)
CREATE POLICY "Admins can delete cash_entries" ON public.cash_entries FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete challans" ON public.challans FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete factories" ON public.factories FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete guti_stock" ON public.guti_stock FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete party_settlements" ON public.party_settlements FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete production_batches" ON public.production_batches FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purchases" ON public.purchases FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sales" ON public.sales FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete transfers" ON public.transfers FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete twobytwo_entries" ON public.twobytwo_entries FOR DELETE USING (has_role(auth.uid(), 'admin'));
