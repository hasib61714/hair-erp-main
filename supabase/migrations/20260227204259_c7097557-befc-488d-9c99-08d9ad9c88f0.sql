
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
