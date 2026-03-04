
-- Drop the overly permissive policy
DROP POLICY "Authenticated manage inventory" ON public.inventory;

-- Replace with specific policies
CREATE POLICY "Users insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update inventory" ON public.inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
