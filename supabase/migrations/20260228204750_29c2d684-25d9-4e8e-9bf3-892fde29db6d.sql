
-- Create buyers table with full contact profile
CREATE TABLE public.buyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  wechat TEXT,
  imo TEXT,
  country TEXT NOT NULL DEFAULT 'BD',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read buyers" ON public.buyers FOR SELECT USING (true);
CREATE POLICY "Users insert buyers" ON public.buyers FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own buyers" ON public.buyers FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete buyers" ON public.buyers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_buyers_updated_at BEFORE UPDATE ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_buyers AFTER INSERT OR UPDATE OR DELETE ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.log_audit();
