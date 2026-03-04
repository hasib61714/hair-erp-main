import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Permission = { can_edit: boolean; can_delete: boolean; can_print: boolean; can_download: boolean };

export const usePermissions = (module: string): Permission & { loading: boolean } => {
  const { role } = useAuth();
  const [perm, setPerm] = useState<Permission>({ can_edit: false, can_delete: false, can_print: true, can_download: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "admin") {
      setPerm({ can_edit: true, can_delete: true, can_print: true, can_download: true });
      setLoading(false);
      return;
    }
    const fetch = async () => {
      const { data } = await supabase
        .from("role_permissions")
        .select("can_edit, can_delete, can_print, can_download")
        .eq("role", role as any)
        .eq("module", module)
        .maybeSingle();
      if (data) setPerm({
        can_edit: data.can_edit,
        can_delete: data.can_delete,
        can_print: (data as any).can_print ?? true,
        can_download: (data as any).can_download ?? true,
      });
      setLoading(false);
    };
    if (role) fetch();
  }, [role, module]);

  return { ...perm, loading };
};
