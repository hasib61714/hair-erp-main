import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowRight, Pencil, Trash2, Factory } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";
import { useConfirm } from "@/contexts/ConfirmContext";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";

type Batch = {
  id: string; batch_code: string; factory_id: string | null; stage: string;
  input_weight_kg: number; output_weight_kg: number | null; loss_kg: number | null;
  efficiency_pct: number | null; status: string;
};
type FactoryRow = { id: string; name: string };

const stageColors: Record<string, string> = {
  guti:       "bg-info/15 text-info",
  kachi:      "bg-warning/15 text-warning",
  twobytwo:   "bg-success/15 text-success",
  two_by_two: "bg-success/15 text-success",
};

const ProductionModule = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { can_edit, can_delete } = usePermissions("production");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [batchCode,    setBatchCode]    = useState("");
  const [factoryId,    setFactoryId]    = useState("");
  const [stage,        setStage]        = useState("guti");
  const [inputWeight,  setInputWeight]  = useState("");
  const [outputWeight, setOutputWeight] = useState("");
  const [status,       setStatus]       = useState("in_progress");

  const stageLabels: Record<string, { bn: string; en: string }> = {
    guti:       { bn: "গুটি",         en: "Guti" },
    kachi:      { bn: "কাছি",         en: "Kachi" },
    twobytwo:   { bn: "টু বাই টু",   en: "Two by Two" },
    two_by_two: { bn: "টু বাই টু",   en: "Two by Two" },
  };

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["production_batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: factories = [] } = useQuery<FactoryRow[]>({
    queryKey: ["factories_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("factories").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const resetForm = () => {
    setBatchCode(""); setFactoryId(""); setStage("guti"); setInputWeight("");
    setOutputWeight(""); setStatus("in_progress"); setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    const iw = parseFloat(inputWeight);
    if (!batchCode || !iw) return;
    const ow   = outputWeight ? parseFloat(outputWeight) : null;
    const loss = ow ? iw - ow : null;
    const eff  = ow ? parseFloat(((ow / iw) * 100).toFixed(1)) : null;

    if (editId) {
      const { error } = await supabase.from("production_batches").update({
        batch_code: batchCode, factory_id: factoryId || null, stage, input_weight_kg: iw,
        output_weight_kg: ow, loss_kg: loss, efficiency_pct: eff, status,
      }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("production_batches").insert({
        batch_code: batchCode, factory_id: factoryId || null, stage, input_weight_kg: iw,
        output_weight_kg: ow, loss_kg: loss, efficiency_pct: eff, status, created_by: user?.id,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved"));
    resetForm();
    qc.invalidateQueries({ queryKey: ["production_batches"] });
  };

  const handleEdit = (b: Batch) => {
    setEditId(b.id); setBatchCode(b.batch_code); setFactoryId(b.factory_id || ""); setStage(b.stage);
    setInputWeight(String(b.input_weight_kg)); setOutputWeight(b.output_weight_kg ? String(b.output_weight_kg) : "");
    setStatus(b.status); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm(t("confirmDeleteItem")))) return;
    const { error } = await supabase.from("production_batches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted"));
    qc.invalidateQueries({ queryKey: ["production_batches"] });
  };

  const getFactoryName = (id: string | null) => factories.find(f => f.id === id)?.name || "—";

  // Only show canonical stages (not duplicates)
  const displayStages = ["guti", "kachi", "two_by_two"] as const;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("productionModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("stageWiseProcessing")}</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary h-9 px-4 gap-2">
          <Plus className="w-4 h-4" />{t("createBatch")}
        </button>
      </div>

      {showForm && (
        <div className="card-base p-6 border-primary/20 animate-slide-up">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("createBatch")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-label mb-1.5 block">{t("batchCode")}</label>
              <input value={batchCode} onChange={e => setBatchCode(e.target.value)} aria-label={t("batchCode")} className="input-base" />
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("factory")}</label>
              <select value={factoryId} onChange={e => setFactoryId(e.target.value)} aria-label={t("factory")} className="input-base">
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("stage")}</label>
              <select value={stage} onChange={e => setStage(e.target.value)} aria-label={t("stage")} className="input-base">
                {Object.entries(stageLabels)
                  .filter(([k]) => !k.includes("_") || k === "two_by_two")
                  .map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("inputWeight")}</label>
              <input type="number" value={inputWeight} onChange={e => setInputWeight(e.target.value)} aria-label={t("inputWeight")} className="input-base" />
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("outputWeight")}</label>
              <input type="number" value={outputWeight} onChange={e => setOutputWeight(e.target.value)} aria-label={t("outputWeight")} className="input-base" />
            </div>
            <div>
              <label className="text-label mb-1.5 block">{t("status")}</label>
              <select value={status} onChange={e => setStatus(e.target.value)} aria-label={t("status")} className="input-base">
                <option value="in_progress">{t("inProgress")}</option>
                <option value="complete">{t("complete")}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} className="btn-primary h-9 px-4">{t("save")}</button>
            <button type="button" onClick={resetForm} className="btn-secondary h-9 px-4">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Stage pipeline flow */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {displayStages.map((key, i) => {
          const label = stageLabels[key];
          const count = batches.filter(b => (b.stage === key || (key === "two_by_two" && b.stage === "twobytwo")) && b.status === "in_progress").length;
          return (
            <div key={key} className="flex items-center gap-3 shrink-0">
              <div className={`rounded-lg px-5 py-3 ${stageColors[key]} border border-current/10`}>
                <p className="text-xs font-medium">{label[lang]}</p>
                <p className="text-lg font-bold">{count} {t("activeBatches")}</p>
              </div>
              {i < displayStages.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="card-base p-6">
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
            <tbody>${items.map((b: Batch) => `<tr><td>${b.batch_code}</td><td>${getFactoryName(b.factory_id)}</td><td>${stageLabels[b.stage]?.[lang] || b.stage}</td><td>${b.input_weight_kg} KG</td><td>${b.output_weight_kg ? b.output_weight_kg + " KG" : "—"}</td><td>${b.loss_kg ? b.loss_kg + " KG" : "—"}</td><td>${b.efficiency_pct ? b.efficiency_pct + "%" : "—"}</td><td>${b.status}</td></tr>`).join("")}
            <tr class="total-row"><td colspan="3">${t("total")}</td><td>${items.reduce((s: number, b: Batch) => s + Number(b.input_weight_kg), 0)} KG</td><td>${items.reduce((s: number, b: Batch) => s + Number(b.output_weight_kg || 0), 0)} KG</td><td>${items.reduce((s: number, b: Batch) => s + Number(b.loss_kg || 0), 0)} KG</td><td></td><td></td></tr>
            </tbody></table>
          `}
        />

        {batchesLoading ? (
          <TableSkeleton rows={4} />
        ) : batches.length === 0 ? (
          <EmptyState title={t("noData")} compact />
        ) : (
          <div className="space-y-4" id="production-cards">
            {batches.map(b => (
              <div
                key={b.id}
                data-card-id={b.id}
                onClick={() => { const s = new Set(selectedIds); s.has(b.id) ? s.delete(b.id) : s.add(b.id); setSelectedIds(s); }}
                className={`card-base p-6 cursor-pointer transition-all ${
                  selectedIds.has(b.id) ? "border-primary ring-2 ring-primary/20" : "card-hover"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      selectedIds.has(b.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    }`}>
                      {selectedIds.has(b.id) && <span className="text-xs">✓</span>}
                    </div>
                    <Factory className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground font-mono">{b.batch_code}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {getFactoryName(b.factory_id)} ·{" "}
                        <span className={`px-1.5 py-0.5 rounded-full ${stageColors[b.stage] || ""}`}>
                          {stageLabels[b.stage]?.[lang] || b.stage}
                        </span>
                        {" "}
                        <span className={`px-1.5 py-0.5 rounded-full ${b.status === "complete" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                          {b.status === "complete" ? t("complete") : t("inProgress")}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {can_edit && (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); handleEdit(b); }} aria-label={t("edit")} className="btn-icon">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {can_delete && (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); handleDelete(b.id); }} aria-label={t("delete")} className="btn-icon text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="table-header-cell text-left">{t("inputWeight")}</th>
                      <th className="table-header-cell text-right">{t("outputWeight")}</th>
                      <th className="table-header-cell text-right">{t("lossWeight")}</th>
                      <th className="table-header-cell text-right">{t("efficiency")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="table-cell font-medium">{b.input_weight_kg} KG</td>
                      <td className="table-cell text-right text-success">{b.output_weight_kg ? `${b.output_weight_kg} KG` : "—"}</td>
                      <td className="table-cell text-right text-destructive">{b.loss_kg ? `${b.loss_kg} KG` : "—"}</td>
                      <td className="table-cell text-right font-medium">{b.efficiency_pct ? `${b.efficiency_pct}%` : "—"}</td>
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
