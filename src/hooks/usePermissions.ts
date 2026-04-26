import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type Permission = {
  can_edit: boolean;
  can_delete: boolean;
  can_print: boolean;
  can_download: boolean;
};

const ADMIN_PERMISSIONS: Permission = {
  can_edit: true,
  can_delete: true,
  can_print: true,
  can_download: true,
};

const DEFAULT_PERMISSIONS: Permission = {
  can_edit: false,
  can_delete: false,
  can_print: true,
  can_download: true,
};

export const usePermissions = (module: string): Permission & { loading: boolean } => {
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["permissions", role, module],
    queryFn: async (): Promise<Permission> => {
      if (role === "admin") return ADMIN_PERMISSIONS;

      const { data: row } = await supabase
        .from("role_permissions")
        .select("can_edit, can_delete, can_print, can_download")
        .eq("role", role as AppRole)
        .eq("module", module)
        .maybeSingle();

      if (!row) return DEFAULT_PERMISSIONS;

      return {
        can_edit: row.can_edit,
        can_delete: row.can_delete,
        can_print: row.can_print,
        can_download: row.can_download,
      };
    },
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...(data ?? DEFAULT_PERMISSIONS),
    loading: isLoading,
  };
};
