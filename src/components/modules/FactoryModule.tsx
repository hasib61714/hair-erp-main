import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Factory, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

type FactoryRow = {
  id: string; name: string; location: string; factory_type: string; is_active: boolean;
};

const FactoryModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("factories");
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState(""); const [location, setLocation] = useState("");
  const [factoryType, setFactoryType] = useState("branch");

  const fetchData = async () => {
    const { data: rows } = await supabase.from("factories").select("*").order("created_at", { ascending: false });
    setData(rows || []); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setName(""); setLocation(""); setFactoryType("branch"); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!name || !location) return;
    if (editId) {
      const { error } = await supabase.from("factories").update({ name, location, factory_type: factoryType }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("factories").insert({ name, location, factory_type: factoryType, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (f: FactoryRow) => {
    setEditId(f.id); setName(f.name); setLocation(f.location); setFactoryType(f.factory_type); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই কারখানা মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("factories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("factoryModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("allLocations")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("addFactory")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addFactory")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("factoryName")}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("location")}</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("factoryType")}</label>
              <select value={factoryType} onChange={e => setFactoryType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="head">{t("headOffice")}</option>
                <option value="branch">{t("branch")}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map(f => (
            <div key={f.id} className="rounded-xl border border-border p-6 bg-gradient-card shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${f.is_active ? "bg-success animate-pulse-gold" : "bg-muted-foreground"}`} />
                  {can_edit && <button onClick={() => handleEdit(f)} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                  {can_delete && <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{f.factory_type === "head" ? t("headOffice") : t("branch")} — {f.location}</p>
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
