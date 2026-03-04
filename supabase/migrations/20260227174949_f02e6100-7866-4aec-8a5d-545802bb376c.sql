
-- Factories table
CREATE TABLE public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  factory_type TEXT NOT NULL DEFAULT 'branch' CHECK (factory_type IN ('head_office', 'branch')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BD' CHECK (country IN ('BD', 'IN')),
  currency TEXT NOT NULL DEFAULT 'BDT' CHECK (currency IN ('BDT', 'INR')),
  weight_kg NUMERIC(10,2) NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(8,4) DEFAULT 1,
  middleman_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  factory_id UUID REFERENCES public.factories(id),
  created_by UUID REFERENCES auth.users(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Production batches
CREATE TABLE public.production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL,
  factory_id UUID REFERENCES public.factories(id),
  stage TEXT NOT NULL DEFAULT 'guti' CHECK (stage IN ('guti', 'kachi', 'two_by_two')),
  input_weight_kg NUMERIC(10,2) NOT NULL,
  output_weight_kg NUMERIC(10,2),
  loss_kg NUMERIC(10,2),
  efficiency_pct NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory (grade-based)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  factory_id UUID REFERENCES public.factories(id),
  stock_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name TEXT NOT NULL,
  buyer_type TEXT NOT NULL DEFAULT 'local' CHECK (buyer_type IN ('chinese', 'local')),
  grade TEXT NOT NULL,
  weight_kg NUMERIC(10,2) NOT NULL,
  rate_per_kg NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  advance_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash entries
CREATE TABLE public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('cash_in', 'cash_out')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  factory_id UUID REFERENCES public.factories(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transfers
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_factory_id UUID REFERENCES public.factories(id),
  to_factory_id UUID REFERENCES public.factories(id),
  weight_kg NUMERIC(10,2) NOT NULL,
  received_weight_kg NUMERIC(10,2),
  weight_diff_kg NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'received')),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challans
CREATE TABLE public.challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_no TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  grade_details JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Party settlements
CREATE TABLE public.party_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name TEXT NOT NULL,
  buyer_rate NUMERIC(10,2) NOT NULL,
  party_rate NUMERIC(10,2) NOT NULL,
  margin NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  processing_cost NUMERIC(12,2) DEFAULT 0,
  payable NUMERIC(12,2) DEFAULT 0,
  paid NUMERIC(12,2) DEFAULT 0,
  due NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read all, write own data
-- Factories (all authenticated can read, admins/managers can write)
CREATE POLICY "Authenticated read factories" ON public.factories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert factories" ON public.factories FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own factories" ON public.factories FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Generic read policies for all tables
CREATE POLICY "Authenticated read purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own purchases" ON public.purchases FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read batches" ON public.production_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert batches" ON public.production_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own batches" ON public.production_batches FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage inventory" ON public.inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own sales" ON public.sales FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read cash" ON public.cash_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert cash" ON public.cash_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own cash" ON public.cash_entries FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read transfers" ON public.transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert transfers" ON public.transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own transfers" ON public.transfers FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read challans" ON public.challans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert challans" ON public.challans FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own challans" ON public.challans FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read party" ON public.party_settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert party" ON public.party_settlements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own party" ON public.party_settlements FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Update timestamp triggers
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.production_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
