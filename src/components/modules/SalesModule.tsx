import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Plus, Pencil, Minus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import TransactionDrawer from "@/components/TransactionDrawer";
import PrintToolbar from "@/components/PrintToolbar";

type GradeDetail = { grade: string; kg: number; rate: number };
type Sale = {
  id: string; sale_date: string; buyer_name: string; buyer_type: string; grade: string;
  weight_kg: number; rate_per_kg: number; total_amount: number; advance_amount: number | null; due_amount: number | null;
  product_type: string; grade_details: GradeDetail[];
};

const countryOptions = [
  { value: "BD", labelKey: "bangladesh" as const, flag: "🇧🇩" },
  { value: "IN", labelKey: "india" as const, flag: "🇮🇳" },
  { value: "CN", labelKey: "china" as const, flag: "🇨🇳" },
  { value: "OTHER", labelKey: "otherCountry" as const, flag: "🌍" },
];

const gradeOptions = ['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'];

const SalesModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("sales");
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [buyerName, setBuyerName] = useState(""); const [buyerType, setBuyerType] = useState("BD");
  const [productType, setProductType] = useState("two_by_two");
  const [grade, setGrade] = useState('6"'); const [weightKg, setWeightKg] = useState("");
  const [ratePerKg, setRatePerKg] = useState(""); const [advanceAmt, setAdvanceAmt] = useState("");
  const [gradeRows, setGradeRows] = useState<GradeDetail[]>([{ grade: '12"', kg: 0, rate: 0 }]);
  const [gutiWeightKg, setGutiWeightKg] = useState("");
  const [gutiRatePerKg, setGutiRatePerKg] = useState("");

  const fetchData = async () => {
    const { data: rows } = await supabase.from("sales").select("*").order("sale_date", { ascending: false });
    setData((rows ?? []).map(r => ({
      ...r,
      grade_details: Array.isArray(r.grade_details) ? (r.grade_details as unknown as GradeDetail[]) : [],
    })));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setBuyerName(""); setBuyerType("BD"); setProductType("two_by_two"); setGrade('6"'); setWeightKg(""); setRatePerKg(""); setAdvanceAmt(""); setEditId(null); setShowForm(false);
    setGradeRows([{ grade: '12"', kg: 0, rate: 0 }]); setGutiWeightKg(""); setGutiRatePerKg("");
  };

  const isGuti = productType === "guti";
  const useGradeRows = productType === "kachi" || productType === "two_by_two";
  const gradeTotal = gradeRows.reduce((s, g) => s + g.kg * g.rate, 0);
  const gradeTotalKg = gradeRows.reduce((s, g) => s + g.kg, 0);

  const updateGradeRow = (i: number, field: keyof GradeDetail, val: string | number) => {
    const copy = [...gradeRows]; copy[i] = { ...copy[i], [field]: field === "grade" ? val : Number(val) }; setGradeRows(copy);
  };

  const handleSave = async () => {
    if (isGuti) {
      const gw = parseFloat(gutiWeightKg); const gr = parseFloat(gutiRatePerKg);
      if (!buyerName || !gw || !gr) return;
    } else if (useGradeRows) {
      if (!buyerName || gradeTotalKg === 0) return;
    } else {
      const w = parseFloat(weightKg); const r = parseFloat(ratePerKg);
      if (!buyerName || !w || !r) return;
    }

    const w = isGuti ? parseFloat(gutiWeightKg) : (useGradeRows ? gradeTotalKg : parseFloat(weightKg));
    const r = isGuti ? parseFloat(gutiRatePerKg) : (useGradeRows ? (gradeTotalKg > 0 ? gradeTotal / gradeTotalKg : 0) : parseFloat(ratePerKg));
    const total = isGuti ? w * r : (useGradeRows ? gradeTotal : w * r);
    const adv = parseFloat(advanceAmt) || 0;
    const due = total - adv;

    type SaleInsert = Database["public"]["Tables"]["sales"]["Insert"];
    const payload: Omit<SaleInsert, "id" | "created_at" | "sale_date"> = {
      buyer_name: buyerName, buyer_type: buyerType, product_type: productType,
      grade: isGuti ? "গুটি" : (useGradeRows ? gradeRows.map(g => g.grade).join(", ") : grade),
      weight_kg: w, rate_per_kg: r,
      total_amount: total, advance_amount: adv, due_amount: due,
      grade_details: (useGradeRows ? gradeRows : []) as unknown as SaleInsert["grade_details"],
    };

    if (editId) {
      const { error } = await supabase.from("sales").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("sales").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (s: Sale) => {
    setEditId(s.id); setBuyerName(s.buyer_name); setBuyerType(s.buyer_type); setProductType(s.product_type || "two_by_two"); setGrade(s.grade);
    setWeightKg(String(s.weight_kg)); setRatePerKg(String(s.rate_per_kg)); setAdvanceAmt(String(s.advance_amount || 0));
    setGradeRows(s.grade_details?.length > 0 ? s.grade_details : [{ grade: '12"', kg: 0, rate: 0 }]);
    if (s.product_type === "guti") { setGutiWeightKg(String(s.weight_kg)); setGutiRatePerKg(String(s.rate_per_kg)); }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const getCountryLabel = (code: string) => {
    const c = countryOptions.find(o => o.value === code);
    return c ? `${c.flag} ${t(c.labelKey)}` : code;
  };

  const totalSales = data.reduce((s, d) => s + Number(d.total_amount), 0);
  const totalAdv = data.reduce((s, d) => s + Number(d.advance_amount || 0), 0);
  const totalDue = data.reduce((s, d) => s + Number(d.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("salesModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("gradeWiseRate")}</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("addSale")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("totalSales")}</p>
          <p className="text-2xl font-bold text-success">৳{totalSales.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("advance")}</p>
          <p className="text-2xl font-bold text-primary">৳{totalAdv.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("dueAmount")}</p>
          <p className="text-2xl font-bold text-destructive">৳{totalDue.toLocaleString()}</p>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addSale")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerName")}</label><input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerCountry")}</label>
              <select aria-label={t("buyerCountry")} value={buyerType} onChange={e => setBuyerType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {countryOptions.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("productType")}</label>
              <select aria-label={t("productType")} value={productType} onChange={e => setProductType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="guti">{t("gutiProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
                <option value="two_by_two">{t("twobytwoProduct")}</option>
              </select>
            </div>
            {isGuti && (
              <>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("weight")}</label><input type="number" value={gutiWeightKg} onChange={e => setGutiWeightKg(e.target.value)} placeholder="মোট কেজি" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("rate")}</label><input type="number" value={gutiRatePerKg} onChange={e => setGutiRatePerKg(e.target.value)} placeholder="প্রতি কেজি দর" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </>
            )}
            {!useGradeRows && !isGuti && (
              <>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("weight")}</label><input aria-label={t("weight")} type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("rate")}</label><input aria-label={t("rate")} type="number" value={ratePerKg} onChange={e => setRatePerKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </>
            )}
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("advance")}</label><input aria-label={t("advance")} type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
          </div>

          {useGradeRows && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">{t("gradeDetails")}</p>
              {gradeRows.map((gr, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-2">
                  <select aria-label={t("grade")} value={gr.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                    {gradeOptions.map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input type="number" placeholder="KG" value={gr.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  <input type="number" placeholder={t("rate")} value={gr.rate || ""} onChange={e => updateGradeRow(i, "rate", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  {gradeRows.length > 1 && (
                    <button type="button" aria-label="Remove grade row" onClick={() => setGradeRows(gradeRows.filter((_, j) => j !== i))} className="h-9 w-9 rounded-lg border border-destructive/30 flex items-center justify-center hover:bg-destructive/10 transition-colors">
                      <Minus className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setGradeRows([...gradeRows, { grade: '12"', kg: 0, rate: 0 }])} className="text-xs text-primary hover:underline mb-2">+ {t("gradeDetails")}</button>
              <p className="text-xs text-foreground mt-1">{t("total")}: {gradeTotalKg} KG | ৳{gradeTotal.toLocaleString()} | {t("due")}: ৳{(gradeTotal - (parseFloat(advanceAmt) || 0)).toLocaleString()}</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("salesHistory")}</h3>
        <PrintToolbar
          moduleName={t("salesHistory")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="sale_date"
          cardContainerId="sales-cards"
          renderPrintTable={(items) => {
            const totalAmt = items.reduce((s: number, d: any) => s + Number(d.total_amount), 0);
            const totalAdv2 = items.reduce((s: number, d: any) => s + Number(d.advance_amount || 0), 0);
            const totalDue2 = items.reduce((s: number, d: any) => s + Number(d.due_amount || 0), 0);
            const totalKg = items.reduce((s: number, d: any) => s + Number(d.weight_kg), 0);
            return `<table><thead><tr><th>ক্রমিক</th><th>${t("date")}</th><th>${t("buyer")}</th><th>${t("productType")}</th><th>ইঞ্চি</th><th style="text-align:right">কেজি</th><th style="text-align:right">রেট (৳)</th><th style="text-align:right">দাম (৳)</th><th style="text-align:right">${t("advance")}</th><th style="text-align:right">${t("due")}</th></tr></thead>
            <tbody>${items.map((s: any, idx: number) => {
              const grades = (s.grade_details || []) as Array<{grade: string; kg: number; rate: number}>;
              const ptLabel = s.product_type === "guti" ? "গুটি" : s.product_type === "kachi" ? "কাচি" : "টু বাই টু";
              if (grades.length > 1) {
                return grades.map((g: any, gi: number) => {
                  const isFirst = gi === 0;
                  const rs = grades.length;
                  return `<tr>${isFirst ? `<td rowspan="${rs}">${idx + 1}</td><td rowspan="${rs}">${s.sale_date}</td><td rowspan="${rs}">${s.buyer_name}</td><td rowspan="${rs}">${ptLabel}</td>` : ''}<td>${g.grade}</td><td style="text-align:right">${g.kg}</td><td style="text-align:right">৳${Number(g.rate).toLocaleString()}</td><td style="text-align:right">৳${(g.kg * g.rate).toLocaleString()}</td>${isFirst ? `<td rowspan="${rs}" style="text-align:right">৳${Number(s.advance_amount || 0).toLocaleString()}</td><td rowspan="${rs}" style="text-align:right">৳${Number(s.due_amount || 0).toLocaleString()}</td>` : ''}</tr>`;
                }).join('');
              } else if (grades.length === 1) {
                const g = grades[0];
                return `<tr><td>${idx + 1}</td><td>${s.sale_date}</td><td>${s.buyer_name}</td><td>${ptLabel}</td><td>${g.grade}</td><td style="text-align:right">${g.kg}</td><td style="text-align:right">৳${Number(g.rate).toLocaleString()}</td><td style="text-align:right">৳${(g.kg * g.rate).toLocaleString()}</td><td style="text-align:right">৳${Number(s.advance_amount || 0).toLocaleString()}</td><td style="text-align:right">৳${Number(s.due_amount || 0).toLocaleString()}</td></tr>`;
              } else {
                return `<tr><td>${idx + 1}</td><td>${s.sale_date}</td><td>${s.buyer_name}</td><td>${ptLabel}</td><td>${s.product_type === "guti" ? "গুটি" : s.grade}</td><td style="text-align:right">${s.weight_kg}</td><td style="text-align:right">৳${Number(s.rate_per_kg).toLocaleString()}</td><td style="text-align:right">৳${Number(s.total_amount).toLocaleString()}</td><td style="text-align:right">৳${Number(s.advance_amount || 0).toLocaleString()}</td><td style="text-align:right">৳${Number(s.due_amount || 0).toLocaleString()}</td></tr>`;
              }
            }).join("")}
            <tr class="total-row"><td colspan="5">${t("total")}</td><td style="text-align:right">${totalKg} KG</td><td></td><td style="text-align:right">৳${totalAmt.toLocaleString()}</td><td style="text-align:right">৳${totalAdv2.toLocaleString()}</td><td style="text-align:right">৳${totalDue2.toLocaleString()}</td></tr>
            </tbody></table>`;
          }}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
           <div className="space-y-4" id="sales-cards">
            {data.map(s => {
              const hasGrades = s.grade_details && s.grade_details.length > 0;
              const ptLabel = s.product_type === "guti" ? t("gutiProduct") : s.product_type === "kachi" ? t("kachiProduct") : t("twobytwoProduct");
              return (
                <div key={s.id} data-card-id={s.id} onClick={() => { const ids = new Set(selectedIds); ids.has(s.id) ? ids.delete(s.id) : ids.add(s.id); setSelectedIds(ids); }} className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedIds.has(s.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(s.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {selectedIds.has(s.id) && <span className="text-xs">✓</span>}
                      </div>
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); setDrawerName(s.buyer_name); setDrawerOpen(true); }} className="text-primary hover:underline cursor-pointer">{s.buyer_name}</button>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.sale_date} · <span className={`px-1.5 py-0.5 rounded-full ${s.product_type === "guti" ? "bg-info/15 text-info" : s.product_type === "kachi" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{ptLabel}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{getCountryLabel(s.buyer_type)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {can_edit && <button type="button" aria-label="Edit sale" onClick={(ev) => { ev.stopPropagation(); handleEdit(s); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                      {can_delete && <button type="button" aria-label="Delete sale" onClick={(ev) => { ev.stopPropagation(); handleDelete(s.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                    </div>
                  </div>

                  {/* Grade breakdown table */}
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("weight")} (KG)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("rate")} (৳)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("total")} (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasGrades ? s.grade_details.map((g, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs font-medium text-foreground">{g.grade}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">৳{Number(g.rate).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">৳{(g.kg * g.rate).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs text-foreground">{s.product_type === "guti" ? "গুটি" : s.grade}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{s.weight_kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">৳{Number(s.rate_per_kg).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">৳{Number(s.total_amount).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                    <span className="text-foreground">মোট: <strong>৳{Number(s.total_amount).toLocaleString()}</strong></span>
                    <span className="text-success">{t("advance")}: <strong>৳{Number(s.advance_amount || 0).toLocaleString()}</strong></span>
                    {Number(s.due_amount || 0) > 0 && <span className="text-destructive">{t("due")}: <strong>৳{Number(s.due_amount).toLocaleString()}</strong></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        personName={drawerName}
        personType="buyer"
      />
    </div>
  );
};

export default SalesModule;
