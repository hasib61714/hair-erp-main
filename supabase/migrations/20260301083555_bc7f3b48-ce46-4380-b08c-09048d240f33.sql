
-- Party Consignments: track raw material sent to parties
CREATE TABLE public.party_consignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_name TEXT NOT NULL,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_kg NUMERIC NOT NULL DEFAULT 0,
  total_returned_kg NUMERIC NOT NULL DEFAULT 0,
  factory_sent_from TEXT DEFAULT '',
  factory_processed_at TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent', -- sent, partial_received, completed
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.party_consignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read party_consignments" ON public.party_consignments FOR SELECT USING (true);
CREATE POLICY "Users insert party_consignments" ON public.party_consignments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own party_consignments" ON public.party_consignments FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete party_consignments" ON public.party_consignments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Party Returns: partial batch returns
CREATE TABLE public.party_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignment_id UUID NOT NULL REFERENCES public.party_consignments(id) ON DELETE CASCADE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_kg NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.party_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read party_returns" ON public.party_returns FOR SELECT USING (true);
CREATE POLICY "Users insert party_returns" ON public.party_returns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own party_returns" ON public.party_returns FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete party_returns" ON public.party_returns FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add grade_details, remand, chhat, comments to party_settlements
ALTER TABLE public.party_settlements
  ADD COLUMN IF NOT EXISTS grade_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS remand_kg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chhat_kg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS consignment_id UUID REFERENCES public.party_consignments(id);

-- Audit triggers
CREATE TRIGGER audit_party_consignments AFTER INSERT OR UPDATE OR DELETE ON public.party_consignments FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_party_returns AFTER INSERT OR UPDATE OR DELETE ON public.party_returns FOR EACH ROW EXECUTE FUNCTION public.log_audit();
