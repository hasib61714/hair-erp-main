
-- Company settings table (single row)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Mahin Enterprise',
  company_address TEXT DEFAULT 'Head Office: Dhaka, Bangladesh',
  company_phone TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  tagline TEXT DEFAULT 'Hair Processing & Trading | Est. 2011',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update company settings" ON public.company_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert company settings" ON public.company_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.company_settings (company_name, company_address, tagline) 
VALUES ('Mahin Enterprise', 'Head Office: Dhaka, Bangladesh', 'Hair Processing & Trading | Est. 2011');
