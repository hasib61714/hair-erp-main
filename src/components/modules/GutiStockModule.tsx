import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, PlusCircle, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type FactoryRow = { id: string; name: string };
type GradeDetail = { guti_type: string; kg: number; rate: number; total: number };
type GutiEntry = {
  id: string;
  entry_date: string;
  supplier_name: string;
  weight_kg: number;
  rate_per_kg: number;
  total_amount: number;
  factory_id: string | null;
  notes: string | null;
  grade_details: GradeDetail[];
};

const GutiStockModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("guti_stock");
  const [data, setData] = useState<GutiEntry[]>([]);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierName, setSupplierName] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [gradeRows, setGradeRows] = useState<GradeDetail[]>([{ guti_type: "", kg: 0, rate: 0, total: 0 }]);

  const fetchData = async () => {
    const [{ data: rows }, { data: f }] = await Promise.all([
      supabase.from("guti_stock").select("*").order("entry_date", { ascending: false }),
      supabase.from("factories").select("id, name"),
    ]);
    setData((rows ?? []).map(r => ({ ...r, grade_details: Array.isArray(r.grade_details) ? (r.grade_details as unknown as GradeDetail[]) : [] })));
    setFactories(f || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split("T")[0]);
    setSupplierName(""); setFactoryId(""); setNotes(""); setEditId(null); setShowForm(false);
    setGradeRows([{ guti_type: "", kg: 0, rate: 0, total: 0 }]);
  };

  const updateGradeRow = (idx: number, field: keyof GradeDetail, value: string | number) => {
    setGradeRows(prev => {
      const rows = [...prev];
      rows[idx] = { ...rows[idx], [field]: value };
      rows[idx].total = (Number(rows[idx].kg) || 0) * (Number(rows[idx].rate) || 0);
      return rows;
    });
  };

  const addGradeRow = () => setGradeRows(prev => [...prev, { guti_type: "", kg: 0, rate: 0, total: 0 }]);
  const removeGradeRow = (idx: number) => setGradeRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const totalWeight = gradeRows.reduce((s, r) => s + (Number(r.kg) || 0), 0);
  const totalAmount = gradeRows.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const handleSave = async () => {
    if (!supplierName || gradeRows.every(r => !r.kg)) return;
    const payload = {
      entry_date: entryDate,
      supplier_name: supplierName,
      weight_kg: totalWeight,
      rate_per_kg: gradeRows.length === 1 ? Number(gradeRows[0].rate) || 0 : 0,
      total_amount: totalAmount,
      factory_id: factoryId || null,
      notes: notes || null,
      grade_details: gradeRows.filter(r => r.kg > 0) as unknown as Json,
    };

    if (editId) {
      const { error } = await supabase.from("guti_stock").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("guti_stock").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (e: GutiEntry) => {
    setEditId(e.id); setEntryDate(e.entry_date); setSupplierName(e.supplier_name);
    setFactoryId(e.factory_id || ""); setNotes(e.notes || ""); setShowForm(true);
    const gd = e.grade_details.length > 0
      ? e.grade_details
      : [{ guti_type: "", kg: e.weight_kg, rate: e.rate_per_kg, total: e.total_amount }];
    setGradeRows(gd);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("guti_stock").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const getFactoryName = (id: string | null) => factories.find(f => f.id === id)?.name || "—";

  const dataTotalWeight = data.reduce((s, e) => s + Number(e.weight_kg), 0);
  const dataTotalValue = data.reduce((s, e) => s + Number(e.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("gutiStockModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("gutiStockDesc")}</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("addEntry")}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("total")} {t("stock")}</p>
          <p className="text-2xl font-bold text-primary">{dataTotalWeight} KG</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("totalValuation")}</p>
          <p className="text-2xl font-bold text-foreground">৳{dataTotalValue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("total")} {t("addEntry")}</p>
          <p className="text-2xl font-bold text-success">{data.length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addEntry")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input aria-label="Entry date" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("supplierName")}</label>
              <input aria-label="Supplier name" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("factory")}</label>
              <select aria-label="Factory" value={factoryId} onChange={e => setFactoryId(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {/* Grade detail rows */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">গুটির বিবরণ (ধরন, কেজি, রেট)</label>
              <button type="button" onClick={addGradeRow} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <PlusCircle className="w-3.5 h-3.5" /> সারি যোগ করুন
              </button>
            </div>
            <div className="space-y-2">
              {gradeRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center">
                  <input placeholder="ধরন (যেমন: A, B, C)" value={row.guti_type} onChange={e => updateGradeRow(idx, "guti_type", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="number" placeholder="কেজি" value={row.kg || ""} onChange={e => updateGradeRow(idx, "kg", parseFloat(e.target.value) || 0)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="number" placeholder="রেট (৳/KG)" value={row.rate || ""} onChange={e => updateGradeRow(idx, "rate", parseFloat(e.target.value) || 0)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">৳{(row.total || 0).toLocaleString()}</span>
                  <button type="button" aria-label="Remove row" onClick={() => removeGradeRow(idx)} className="p-1 rounded hover:bg-destructive/10"><XCircle className="w-4 h-4 text-destructive/70" /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              মোট: <span className="font-bold text-foreground">{totalWeight} KG</span> | মোট মূল্য: <span className="font-bold text-foreground">৳{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">{t("description")}</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("description")} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
        <>
          <PrintToolbar
            moduleName={t("gutiStockModule")}
            data={data}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            dateField="entry_date"
            cardContainerId="guti-cards"
            renderPrintTable={(items) => {
              const tw = items.reduce((s: number, e: any) => s + Number(e.weight_kg), 0);
              const tv = items.reduce((s: number, e: any) => s + Number(e.total_amount), 0);
              return `<table><thead><tr><th>তারিখ</th><th>সরবরাহকারী</th><th>কারখানা</th><th>গুটির বিবরণ</th><th style="text-align:right">মোট ওজন (KG)</th><th style="text-align:right">মোট (৳)</th></tr></thead><tbody>${items.map((e: any) => {
                const gd = (e.grade_details || []) as GradeDetail[];
                const gradeHtml = gd.length > 0
                  ? gd.map((g: GradeDetail) => `${g.guti_type ? `<b>${g.guti_type}</b> — ` : ''}${g.kg} KG × ৳${Number(g.rate).toLocaleString()} = ৳${Number(g.total).toLocaleString()}`).join('<br/>')
                  : `${Number(e.weight_kg)} KG × ৳${Number(e.rate_per_kg).toLocaleString()} = ৳${Number(e.total_amount).toLocaleString()}`;
                return `<tr><td>${e.entry_date}</td><td>${e.supplier_name}</td><td>${getFactoryName(e.factory_id)}</td><td style="font-size:11px;line-height:1.8">${gradeHtml}</td><td style="text-align:right">${Number(e.weight_kg)}</td><td style="text-align:right">৳${Number(e.total_amount).toLocaleString()}</td></tr>`;
              }).join("")}</tbody><tfoot><tr class="total-row"><td colspan="4">মোট</td><td style="text-align:right">${tw} KG</td><td style="text-align:right">৳${tv.toLocaleString()}</td></tr></tfoot></table>`;
            }}
          />
          <div className="space-y-4" id="guti-cards">
            {data.map(e => {
              const gd = (e.grade_details || []) as GradeDetail[];
              return (
                <div key={e.id} data-card-id={e.id} onClick={() => { const s = new Set(selectedIds); s.has(e.id) ? s.delete(e.id) : s.add(e.id); setSelectedIds(s); }} className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedIds.has(e.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(e.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {selectedIds.has(e.id) && <span className="text-xs">✓</span>}
                      </div>
                      <Package className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{e.supplier_name}</p>
                        <p className="text-[11px] text-muted-foreground">{e.entry_date}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {e.factory_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">কারখানা: {getFactoryName(e.factory_id)}</span>}
                          {e.notes && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{e.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {can_edit && <button type="button" aria-label="Edit entry" onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                      {can_delete && <button type="button" aria-label="Delete entry" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                    </div>
                  </div>

                  {/* Grade breakdown table */}
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">ধরন</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("weight")} (KG)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">রেট (৳/KG)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("total")} (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gd.length > 0 ? gd.map((g, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs font-medium text-foreground">{g.guti_type || '—'}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">৳{Number(g.rate).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">৳{Number(g.total).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs text-foreground">—</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{Number(e.weight_kg)} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">৳{Number(e.rate_per_kg).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">৳{Number(e.total_amount).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Summary row */}
                  <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                    <span className="text-foreground">মোট ওজন: <strong>{Number(e.weight_kg)} KG</strong></span>
                    <span className="text-primary">মোট মূল্য: <strong>৳{Number(e.total_amount).toLocaleString()}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default GutiStockModule;
