import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Factory, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePermissions } from "@/hooks/usePermissions";
import EmptyState from "@/components/ui/empty-state";

type FactoryRow = {
  id: string; name: string; location: string; factory_type: string; is_active: boolean;
};

const FactoryModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { can_edit, can_delete } = usePermissions("factories");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [factoryType, setFactoryType] = useState("branch");

  const { data: factories = [], isLoading } = useQuery<FactoryRow[]>({
    queryKey: ["factories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const resetForm = () => {
    setName(""); setLocation(""); setFactoryType("branch"); setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!name || !location) return;
    if (editId) {
      const { error } = await supabase.from("factories").update({ name, location, factory_type: factoryType }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("factories").insert({ name, location, factory_type: factoryType, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved"));
    resetForm();
    qc.invalidateQueries({ queryKey: ["factories"] });
    qc.invalidateQueries({ queryKey: ["factories_list"] });
  };

  const handleEdit = (f: FactoryRow) => {
    setEditId(f.id); setName(f.name); setLocation(f.location); setFactoryType(f.factory_type); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm(t("confirmDeleteItem")))) return;
    const { error } = await supabase.from("factories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    qc.invalidateQueries({ queryKey: ["factories"] });
    qc.invalidateQueries({ queryKey: ["factories_list"] });
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("factoryModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("allLocations")}</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary h-9 px-4 gap-2">
          <Plus className="w-4 h-4" />{t("addFactory")}
        </button>
      </div>

      {showForm && (
        <div className="card-base p-6 border-primary/20 animate-slide-up">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addFactory")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-label mb-1.5 block">{t("factoryName")}</label>
              <input value={name} onChange={e => setName(e.target.value)} aria-label={t("factoryName")} className="input-base" />
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("location")}</label>
              <input value={location} onChange={e => setLocation(e.target.value)} aria-label={t("location")} className="input-base" />
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("factoryType")}</label>
              <select value={factoryType} onChange={e => setFactoryType(e.target.value)} aria-label={t("factoryType")} className="input-base">
                <option value="head">{t("headOffice")}</option>
                <option value="branch">{t("branch")}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} className="btn-primary h-9 px-4">{t("save")}</button>
            <button type="button" onClick={resetForm} className="btn-secondary h-9 px-4">{t("cancel")}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : factories.length === 0 ? (
        <EmptyState title={t("noData")} compact />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {factories.map(f => (
            <div key={f.id} className="card-hover p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${f.is_active ? "bg-success animate-pulse-gold" : "bg-muted-foreground"}`} />
                  {can_edit && (
                    <button type="button" onClick={() => handleEdit(f)} aria-label={t("edit")} className="btn-icon">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {can_delete && (
                    <button type="button" onClick={() => handleDelete(f.id)} aria-label={t("delete")} className="btn-icon text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {f.factory_type === "head" ? t("headOffice") : t("branch")} — {f.location}
              </p>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${f.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {f.is_active ? t("active") : t("inactive")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FactoryModule;
