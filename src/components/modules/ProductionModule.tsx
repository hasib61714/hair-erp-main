import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowRight, Pencil, Trash2, Factory } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type Batch = {
  id: string; batch_code: string; factory_id: string | null; stage: string;
  input_weight_kg: number; output_weight_kg: number | null; loss_kg: number | null;
  efficiency_pct: number | null; status: string;
};
type FactoryRow = { id: string; name: string };

const stageLabels: Record<string, { bn: string; en: string; color: string }> = {
  guti: { bn: "গুটি", en: "Guti", color: "bg-info/15 text-info" },
  kachi: { bn: "কাছি", en: "Kachi", color: "bg-warning/15 text-warning" },
  twobytwo: { bn: "টু বাই টু", en: "Two by Two", color: "bg-success/15 text-success" },
  two_by_two: { bn: "টু বাই টু", en: "Two by Two", color: "bg-success/15 text-success" },
};

const ProductionModule = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("production");
  const [showForm, setShowForm] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [batchCode, setBatchCode] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [stage, setStage] = useState("guti");
  const [inputWeight, setInputWeight] = useState("");
  const [outputWeight, setOutputWeight] = useState("");
  const [status, setStatus] = useState("in_progress");

  const fetchData = async () => {
    const [{ data: b }, { data: f }] = await Promise.all([
      supabase.from("production_batches").select("*").order("created_at", { ascending: false }),
      supabase.from("factories").select("id, name"),
    ]);
    setBatches(b || []); setFactories(f || []); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setBatchCode(""); setFactoryId(""); setStage("guti"); setInputWeight(""); setOutputWeight(""); setStatus("in_progress"); setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    const iw = parseFloat(inputWeight); if (!batchCode || !iw) return;
    const ow = outputWeight ? parseFloat(outputWeight) : null;
    const loss = ow ? iw - ow : null;
    const eff = ow ? (ow / iw) * 100 : null;

    if (editId) {
      const { error } = await supabase.from("production_batches").update({
        batch_code: batchCode, factory_id: factoryId || null, stage, input_weight_kg: iw,
        output_weight_kg: ow, loss_kg: loss, efficiency_pct: eff ? parseFloat(eff.toFixed(1)) : null, status,
      }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("production_batches").insert({
        batch_code: batchCode, factory_id: factoryId || null, stage, input_weight_kg: iw,
        output_weight_kg: ow, loss_kg: loss, efficiency_pct: eff ? parseFloat(eff.toFixed(1)) : null, status, created_by: user?.id,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (b: Batch) => {
    setEditId(b.id); setBatchCode(b.batch_code); setFactoryId(b.factory_id || ""); setStage(b.stage);
    setInputWeight(String(b.input_weight_kg)); setOutputWeight(b.output_weight_kg ? String(b.output_weight_kg) : ""); setStatus(b.status); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই ব্যাচ মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("production_batches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const getFactoryName = (id: string | null) => factories.find(f => f.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("productionModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("stageWiseProcessing")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("createBatch")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("createBatch")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("batchCode")}</label>
              <input value={batchCode} onChange={e => setBatchCode(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("factory")}</label>
              <select value={factoryId} onChange={e => setFactoryId(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("stage")}</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {Object.entries(stageLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("inputWeight")}</label>
              <input type="number" value={inputWeight} onChange={e => setInputWeight(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("outputWeight")}</label>
              <input type="number" value={outputWeight} onChange={e => setOutputWeight(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("status")}</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="in_progress">{t("inProgress")}</option>
                <option value="complete">{t("complete")}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Stage Flow */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {Object.entries(stageLabels).map(([key, val], i) => (
          <div key={key} className="flex items-center gap-3 shrink-0">
            <div className={`rounded-lg px-5 py-3 ${val.color} border border-current/10`}>
              <p className="text-xs font-medium">{val[lang]}</p>
              <p className="text-lg font-bold">{batches.filter(b => b.stage === key && b.status === "in_progress").length} {t("activeBatches")}</p>
            </div>
            {i < 2 && <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("batchTracking")}</h3>
        <PrintToolbar
          moduleName={t("batchTracking")}
          data={batches}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="created_at"
          cardContainerId="production-cards"
          renderPrintTable={(items) => `
            <table><thead><tr><th>${t("batchId")}</th><th>${t("factory")}</th><th>${t("stage")}</th><th>${t("inputWeight")}</th><th>${t("outputWeight")}</th><th>${t("lossWeight")}</th><th>${t("efficiency")}</th><th>${t("status")}</th></tr></thead>
            <tbody>${items.map((b: any) => `<tr><td>${b.batch_code}</td><td>${getFactoryName(b.factory_id)}</td><td>${stageLabels[b.stage]?.[lang] || b.stage}</td><td>${b.input_weight_kg} KG</td><td>${b.output_weight_kg ? b.output_weight_kg + " KG" : "—"}</td><td>${b.loss_kg ? b.loss_kg + " KG" : "—"}</td><td>${b.efficiency_pct ? b.efficiency_pct + "%" : "—"}</td><td>${b.status}</td></tr>`).join("")}
            <tr class="total-row"><td colspan="3">${t("total")}</td><td>${items.reduce((s: number, b: any) => s + Number(b.input_weight_kg), 0)} KG</td><td>${items.reduce((s: number, b: any) => s + Number(b.output_weight_kg || 0), 0)} KG</td><td>${items.reduce((s: number, b: any) => s + Number(b.loss_kg || 0), 0)} KG</td><td></td><td></td></tr>
            </tbody></table>
          `}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : batches.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
          <div className="space-y-4" id="production-cards">
            {batches.map(b => (
              <div key={b.id} data-card-id={b.id} onClick={() => { const s = new Set(selectedIds); s.has(b.id) ? s.delete(b.id) : s.add(b.id); setSelectedIds(s); }} className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedIds.has(b.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(b.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                      {selectedIds.has(b.id) && <span className="text-xs">✓</span>}
                    </div>
                    <Factory className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground font-mono">{b.batch_code}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {getFactoryName(b.factory_id)} · <span className={`px-1.5 py-0.5 rounded-full ${stageLabels[b.stage]?.color || ""}`}>{stageLabels[b.stage]?.[lang] || b.stage}</span>
                        {' '}<span className={`px-1.5 py-0.5 rounded-full ${b.status === "complete" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{b.status === "complete" ? t("complete") : t("inProgress")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {can_edit && <button onClick={(ev) => { ev.stopPropagation(); handleEdit(b); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                    {can_delete && <button onClick={(ev) => { ev.stopPropagation(); handleDelete(b.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                  </div>
                </div>

                {/* Detail table */}
                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("inputWeight")}</th>
                      <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("outputWeight")}</th>
                      <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("lossWeight")}</th>
                      <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("efficiency")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs font-medium text-foreground">{b.input_weight_kg} KG</td>
                      <td className="py-2 pr-3 text-xs text-right text-success">{b.output_weight_kg ? `${b.output_weight_kg} KG` : "—"}</td>
                      <td className="py-2 pr-3 text-xs text-right text-destructive">{b.loss_kg ? `${b.loss_kg} KG` : "—"}</td>
                      <td className="py-2 text-xs text-right font-medium text-foreground">{b.efficiency_pct ? `${b.efficiency_pct}%` : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionModule;
