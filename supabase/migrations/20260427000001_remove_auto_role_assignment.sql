-- Security fix: Remove automatic 'accountant' role assignment on signup.
-- New users now have NO role until an admin assigns one via the Settings module.
-- This prevents unauthorized access if public signup is enabled.

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();
