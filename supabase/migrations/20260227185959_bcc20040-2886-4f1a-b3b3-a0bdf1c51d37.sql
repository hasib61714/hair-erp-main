
-- Add grade_details JSONB to purchases for kachi/two_by_two grade rows
ALTER TABLE public.purchases ADD COLUMN grade_details jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add grade_details JSONB to sales for kachi/two_by_two grade rows
ALTER TABLE public.sales ADD COLUMN grade_details jsonb NOT NULL DEFAULT '[]'::jsonb;
