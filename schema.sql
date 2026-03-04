-- ============================================================
-- Mahin Enterprise ERP - Full Database Schema
-- Developed by Md. Hasibul Hasan
-- Run this file in your Supabase SQL Editor
-- ============================================================

-- ==== 20260227174532_06a942aa-6b69-4b27-aeea-ffd202028148.sql ====

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'factory_manager', 'accountant');
SELECT auth.uid();
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'accountant');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ==== 20260227174949_f02e6100-7866-4aec-8a5d-545802bb376c.sql ====

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


-- ==== 20260227175047_74315a54-14ef-4ead-a577-f5f4ea6d3dae.sql ====

-- Drop the overly permissive policy
DROP POLICY "Authenticated manage inventory" ON public.inventory;

-- Replace with specific policies
CREATE POLICY "Users insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update inventory" ON public.inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- ==== 20260227183118_ce88cef0-7764-478c-a5bd-8b4e08c4ccaa.sql ====

-- Add guti_grade to purchases
ALTER TABLE public.purchases ADD COLUMN guti_grade text DEFAULT '';

-- Add buyer_country to challans
ALTER TABLE public.challans ADD COLUMN buyer_country text NOT NULL DEFAULT 'BD';

-- Update sales buyer_type to support more countries (existing data: "chinese" -> "CN", "local" -> "BD")
UPDATE public.sales SET buyer_type = 'CN' WHERE buyer_type = 'chinese';
UPDATE public.sales SET buyer_type = 'BD' WHERE buyer_type = 'local';


-- ==== 20260227184145_7c1be521-9527-462f-9d0d-0579e63a3818.sql ====
ALTER TABLE public.sales ADD COLUMN product_type text NOT NULL DEFAULT 'two_by_two';

-- ==== 20260227184722_577915d0-f61a-408f-985b-435264b91f00.sql ====
ALTER TABLE public.challans ADD COLUMN product_type text NOT NULL DEFAULT 'two_by_two';

-- ==== 20260227185151_95813a8a-ee59-4dfd-bfdd-886d83b3f222.sql ====
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

-- ==== 20260227185614_b915321e-5e7c-4101-8207-a440b4a7353f.sql ====

-- Add payment tracking fields to cash_entries
ALTER TABLE public.cash_entries ADD COLUMN person_name text DEFAULT NULL;
ALTER TABLE public.cash_entries ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add bata_rate to purchases for INR conversion tracking
ALTER TABLE public.purchases ADD COLUMN bata_rate numeric DEFAULT NULL;
ALTER TABLE public.purchases ADD COLUMN bdt_paid numeric DEFAULT NULL;


-- ==== 20260227185959_bcc20040-2886-4f1a-b3b3-a0bdf1c51d37.sql ====

-- Add grade_details JSONB to purchases for kachi/two_by_two grade rows
ALTER TABLE public.purchases ADD COLUMN grade_details jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add grade_details JSONB to sales for kachi/two_by_two grade rows
ALTER TABLE public.sales ADD COLUMN grade_details jsonb NOT NULL DEFAULT '[]'::jsonb;


-- ==== 20260227190501_6c7dd2c8-19d5-479b-a31b-72d5f1b45c47.sql ====

-- Add booking slip fields to transfers
ALTER TABLE public.transfers ADD COLUMN recipient_name text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN recipient_address text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN recipient_phone text DEFAULT NULL;
ALTER TABLE public.transfers ADD COLUMN courier_name text DEFAULT NULL;


-- ==== 20260227191529_0bb943b6-ada5-4c1b-8297-3fe4dc2a6a4a.sql ====

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);


-- ==== 20260227192336_32fa0b2a-02df-4427-bac3-5059c80ee798.sql ====

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


-- ==== 20260227192731_03dfec39-85fc-4cc6-9e4e-a798ad1181a7.sql ====

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


-- ==== 20260227194007_b23f7c1f-2d01-4465-8311-54ec9bccb319.sql ====
-- Add product_type column to inventory table
ALTER TABLE public.inventory 
ADD COLUMN product_type text NOT NULL DEFAULT 'two_by_two';


-- ==== 20260227195035_63b8d92c-9545-4f91-97a7-e07519b06e82.sql ====

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


-- ==== 20260227200125_fa130c1d-b5d2-4308-a18f-275a3b62f1d8.sql ====
ALTER TABLE public.twobytwo_entries 
ADD COLUMN carton_no text DEFAULT '',
ADD COLUMN factory_name text DEFAULT '',
ADD COLUMN guti_type text DEFAULT '';

-- ==== 20260227200718_06f2a7ce-14a9-4e89-94ef-622d4430a8ce.sql ====
ALTER TABLE public.twobytwo_entries ADD COLUMN guti_cost_per_kg numeric DEFAULT 0;

-- ==== 20260227202026_abd92a75-29cb-4781-9e35-1836ca3bbc51.sql ====

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');


-- ==== 20260227204259_c7097557-befc-488d-9c99-08d9ad9c88f0.sql ====

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_module TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link_module TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link_module)
  SELECT ur.user_id, p_title, p_message, p_type, p_link_module
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- Function to notify specific user
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link_module TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link_module)
  VALUES (p_user_id, p_title, p_message, p_type, p_link_module);
END;
$$;

-- Trigger: notify on new sale
CREATE OR REPLACE FUNCTION public.on_new_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'নতুন বিক্রয়',
    NEW.buyer_name || ' — ' || NEW.weight_kg || ' KG, ৳' || NEW.total_amount,
    'sale',
    'sales'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_sale
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.on_new_sale();

-- Trigger: notify on new purchase
CREATE OR REPLACE FUNCTION public.on_new_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'নতুন ক্রয়',
    NEW.supplier_name || ' — ' || NEW.weight_kg || ' KG, ৳' || NEW.total_price,
    'purchase',
    'purchase'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_purchase
AFTER INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.on_new_purchase();

-- Trigger: notify on transfer status change
CREATE OR REPLACE FUNCTION public.on_transfer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_admins(
      'ট্রান্সফার আপডেট',
      NEW.weight_kg || ' KG — স্ট্যাটাস: ' || NEW.status,
      'transfer',
      'transfers'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_update
AFTER UPDATE ON public.transfers
FOR EACH ROW EXECUTE FUNCTION public.on_transfer_update();

-- Trigger: notify on new transfer (booking)
CREATE OR REPLACE FUNCTION public.on_new_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    'নতুন বুকিং/ট্রান্সফার',
    COALESCE(NEW.recipient_name, '') || ' — ' || NEW.weight_kg || ' KG',
    'booking',
    'transfers'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_transfer
AFTER INSERT ON public.transfers
FOR EACH ROW EXECUTE FUNCTION public.on_new_transfer();

-- Trigger: notify on production batch completion
CREATE OR REPLACE FUNCTION public.on_batch_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    PERFORM notify_admins(
      'উৎপাদন সম্পন্ন',
      NEW.batch_code || ' — আউটপুট: ' || COALESCE(NEW.output_weight_kg, 0) || ' KG',
      'production',
      'production'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_batch_complete
AFTER UPDATE ON public.production_batches
FOR EACH ROW EXECUTE FUNCTION public.on_batch_complete();

-- Trigger: notify on low inventory
CREATE OR REPLACE FUNCTION public.on_inventory_low()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_kg < 10 THEN
    PERFORM notify_admins(
      'স্টক কম!',
      NEW.grade || ' — মাত্র ' || NEW.stock_kg || ' KG বাকি আছে',
      'warning',
      'inventory'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_low
AFTER UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.on_inventory_low();


-- ==== 20260228202021_d84620e1-7089-4f06-a68b-23d36fc2b71a.sql ====

ALTER TABLE public.role_permissions 
ADD COLUMN can_print boolean NOT NULL DEFAULT true,
ADD COLUMN can_download boolean NOT NULL DEFAULT true;


-- ==== 20260228203902_39d8ef37-3c32-4579-82a0-87150993095b.sql ====

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


-- ==== 20260228204750_29c2d684-25d9-4e8e-9bf3-892fde29db6d.sql ====

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


-- ==== 20260301082149_a81af988-e8fc-478f-bf9a-28146daba6a5.sql ====
-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ==== 20260301083555_bc7f3b48-ce46-4380-b08c-09048d240f33.sql ====

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


-- ==== 20260301094105_9b81d7d1-1414-4eec-be0b-3cd329bc2f7b.sql ====

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


-- ==== 20260301101016_f74d2649-b1d5-4a13-98d3-1ecb670b3a59.sql ====
ALTER TABLE public.guti_stock ADD COLUMN IF NOT EXISTS grade_details jsonb NOT NULL DEFAULT '[]'::jsonb;

