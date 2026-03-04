
-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  country text NOT NULL DEFAULT 'BD',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Users insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own suppliers" ON public.suppliers FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Buyer payments tracking table
CREATE TABLE public.buyer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name text NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.buyer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read buyer_payments" ON public.buyer_payments FOR SELECT USING (true);
CREATE POLICY "Users insert buyer_payments" ON public.buyer_payments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own buyer_payments" ON public.buyer_payments FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete buyer_payments" ON public.buyer_payments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  action text NOT NULL,
  module text NOT NULL,
  record_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit_logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Audit log trigger function
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_name text;
  _action text;
  _details jsonb;
BEGIN
  SELECT full_name INTO _user_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _details := to_jsonb(NEW);
    INSERT INTO public.audit_logs (user_id, user_name, action, module, record_id, details)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(_user_name, 'System'), _action, TG_TABLE_NAME, NEW.id, _details);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    INSERT INTO public.audit_logs (user_id, user_name, action, module, record_id, details)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(_user_name, 'System'), _action, TG_TABLE_NAME, NEW.id, _details);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _details := to_jsonb(OLD);
    INSERT INTO public.audit_logs (user_id, user_name, action, module, record_id, details)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), COALESCE(_user_name, 'System'), _action, TG_TABLE_NAME, OLD.id, _details);
    RETURN OLD;
  END IF;
END;
$$;

-- Attach audit triggers to key tables
CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_cash_entries AFTER INSERT OR UPDATE OR DELETE ON public.cash_entries FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_transfers AFTER INSERT OR UPDATE OR DELETE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_challans AFTER INSERT OR UPDATE OR DELETE ON public.challans FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_production_batches AFTER INSERT OR UPDATE OR DELETE ON public.production_batches FOR EACH ROW EXECUTE FUNCTION public.log_audit();
