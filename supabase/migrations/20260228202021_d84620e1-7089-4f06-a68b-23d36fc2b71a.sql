
ALTER TABLE public.role_permissions 
ADD COLUMN can_print boolean NOT NULL DEFAULT true,
ADD COLUMN can_download boolean NOT NULL DEFAULT true;
