import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type GradeRow = { grade: string; kg: number };
type Entry = {
  id: string; entry_date: string; owner_name: string; product_type: string;
  grade_details: GradeRow[]; total_input_kg: number; total_output_kg: number;
  chhat_kg: number; remand_kg: number;
  carton_no: string; factory_name: string; guti_type: string;
  guti_cost_per_kg: number;
};

const GRADES = ['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'];

const TwoByTwoStockModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("twobytwo_stock");
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [ownerName, setOwnerName] = useState("");
  const [cartonNo, setCartonNo] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [gutiType, setGutiType] = useState("");
  const [productType, setProductType] = useState("two_by_two");
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([{ grade: '6"', kg: 0 }]);
  const [chhatKg, setChhatKg] = useState("");
  const [remandKg, setRemandKg] = useState("");
  const [totalInputKg, setTotalInputKg] = useState("");
  const [gutiCostPerKg, setGutiCostPerKg] = useState("");

  const fetchData = async () => {
    const { data: rows } = await supabase.from("twobytwo_entries").select("*").order("entry_date", { ascending: false });
    setData((rows || []).map(r => ({ ...r, grade_details: (r.grade_details || []) as unknown as GradeRow[], carton_no: (r as any).carton_no || "", factory_name: (r as any).factory_name || "", guti_type: (r as any).guti_type || "", guti_cost_per_kg: Number((r as any).guti_cost_per_kg) || 0 })));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split("T")[0]); setOwnerName(""); setProductType("two_by_two");
    setCartonNo(""); setFactoryName(""); setGutiType(""); setGutiCostPerKg("");
    setGradeRows([{ grade: '6"', kg: 0 }]); setChhatKg(""); setRemandKg(""); setTotalInputKg("");
    setEditId(null); setShowForm(false);
  };

  const totalOutputCalc = gradeRows.reduce((s, g) => s + g.kg, 0);

  const handleSave = async () => {
    if (!ownerName) return;
    const chhat = parseFloat(chhatKg) || 0;
    const remand = parseFloat(remandKg) || 0;
    const input = parseFloat(totalInputKg) || 0;

    const payload = {
      entry_date: entryDate, owner_name: ownerName, product_type: productType,
      grade_details: gradeRows as any, total_input_kg: input, total_output_kg: totalOutputCalc,
      chhat_kg: chhat, remand_kg: remand,
      carton_no: cartonNo, factory_name: factoryName, guti_type: gutiType,
      guti_cost_per_kg: parseFloat(gutiCostPerKg) || 0,
    };

    if (editId) {
      const { error } = await supabase.from("twobytwo_entries").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("twobytwo_entries").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (e: Entry) => {
    setEditId(e.id); setEntryDate(e.entry_date); setOwnerName(e.owner_name);
    setCartonNo(e.carton_no || ""); setFactoryName(e.factory_name || ""); setGutiType(e.guti_type || "");
    setProductType(e.product_type); setGradeRows(e.grade_details.length > 0 ? e.grade_details : [{ grade: '6"', kg: 0 }]);
    setGutiCostPerKg(String(e.guti_cost_per_kg || ""));
    setChhatKg(String(e.chhat_kg)); setRemandKg(String(e.remand_kg)); setTotalInputKg(String(e.total_input_kg)); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("twobytwo_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const updateGradeRow = (i: number, field: keyof GradeRow, val: string | number) => {
    const copy = [...gradeRows]; copy[i] = { ...copy[i], [field]: field === "grade" ? val : Number(val) }; setGradeRows(copy);
  };

  const getProductLabel = (pt: string) => pt === "kachi" ? t("kachiProduct") : t("twobytwoProduct");

  const totalChhat = data.reduce((s, e) => s + Number(e.chhat_kg), 0);
  const totalRemand = data.reduce((s, e) => s + Number(e.remand_kg), 0);
  const totalOut = data.reduce((s, e) => s + Number(e.total_output_kg), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("twobytwoModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("gradeWiseBreakdown")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("addEntry")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("totalOutput")}</p>
          <p className="text-2xl font-bold text-success">{totalOut} KG</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("chhat")}</p>
          <p className="text-2xl font-bold text-destructive">{totalChhat} KG</p>
        </div>
        <div className="rounded-xl border border-warning/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("remand")}</p>
          <p className="text-2xl font-bold text-warning">{totalRemand} KG</p>
        </div>
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("total")} {t("addEntry")}</p>
          <p className="text-2xl font-bold text-primary">{data.length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addEntry")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("ownerName")}</label>
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">কার্টুন নম্বর</label>
              <input value={cartonNo} onChange={e => setCartonNo(e.target.value)} placeholder="কার্টুন নং" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">কোন কারখানার কাজ</label>
              <input value={factoryName} onChange={e => setFactoryName(e.target.value)} placeholder="কারখানার নাম" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">কোন গুটির কাজ</label>
              <input value={gutiType} onChange={e => setGutiType(e.target.value)} placeholder="গুটির ধরন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">গুটির পড়ন (৳/KG)</label>
              <input type="number" value={gutiCostPerKg} onChange={e => setGutiCostPerKg(e.target.value)} placeholder="প্রতি কেজি খরচ" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("productType")}</label>
              <select value={productType} onChange={e => setProductType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="two_by_two">{t("twobytwoProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("totalInput")} (KG)</label>
              <input type="number" value={totalInputKg} onChange={e => setTotalInputKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">{t("gradeWiseBreakdown")} ({t("totalOutput")}: {totalOutputCalc} KG)</p>
          {gradeRows.map((gr, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 mb-2">
              <select value={gr.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
              <input type="number" placeholder="KG" value={gr.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
            </div>
          ))}
          <button onClick={() => setGradeRows([...gradeRows, { grade: '6"', kg: 0 }])} className="text-xs text-primary mb-4">+ {t("grade")} যোগ করুন</button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("chhat")} (KG)</label>
              <input type="number" value={chhatKg} onChange={e => setChhatKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("remand")} (KG)</label>
              <input type="number" value={remandKg} onChange={e => setRemandKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Data List */}
      {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
        <>
        <PrintToolbar
          moduleName={t("twobytwoModule")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="entry_date"
          cardContainerId="twobytwo-cards"
          renderPrintTable={(items) => {
            const tOut = items.reduce((s: number, e: any) => s + Number(e.total_output_kg), 0);
            const tIn = items.reduce((s: number, e: any) => s + Number(e.total_input_kg), 0);
            return `<table style="font-size:12px;border-collapse:collapse;width:100%"><thead><tr><th>ক্রমিক</th><th>তারিখ</th><th>মালিক</th><th>কারখানা</th><th>পণ্য</th><th>ইঞ্চি</th><th style="text-align:right">কেজি</th><th>গুটির ধরন</th><th style="text-align:right">গুটির পড়ন (৳/KG)</th><th>কার্টুন নং</th><th style="text-align:right">ইনপুট (KG)</th><th style="text-align:right">আউটপুট (KG)</th><th style="text-align:right">ছাট (KG)</th><th style="text-align:right">রিমান্ড (KG)</th></tr></thead><tbody>${items.map((e: any, idx: number) => {
              const grades = (e.grade_details || []) as Array<{grade: string; kg: number}>;
              const ptLabel = e.product_type === "kachi" ? "কাচি" : "টু বাই টু";
              const rowCount = Math.max(grades.length, 1);
              const commonTd = (val: string, align?: string) => `<td rowspan="${rowCount}" style="vertical-align:top;${align ? 'text-align:' + align + ';' : ''}">${val}</td>`;
              if (grades.length > 0) {
                return grades.map((g: any, gi: number) => {
                  const isFirst = gi === 0;
                  return `<tr>${isFirst ? commonTd(String(idx + 1)) : ''}${isFirst ? commonTd(e.entry_date) : ''}${isFirst ? commonTd(e.owner_name) : ''}${isFirst ? commonTd(e.factory_name || '—') : ''}${isFirst ? commonTd(ptLabel) : ''}<td>${g.grade || '—'}</td><td style="text-align:right">${Number(g.kg)}</td>${isFirst ? commonTd(e.guti_type || '—') : ''}${isFirst ? commonTd(Number(e.guti_cost_per_kg) > 0 ? '৳' + Number(e.guti_cost_per_kg) : '—', 'right') : ''}${isFirst ? commonTd(e.carton_no || '—') : ''}${isFirst ? commonTd(String(Number(e.total_input_kg)), 'right') : ''}${isFirst ? commonTd(String(Number(e.total_output_kg)), 'right') : ''}${isFirst ? commonTd(String(Number(e.chhat_kg)), 'right') : ''}${isFirst ? commonTd(String(Number(e.remand_kg)), 'right') : ''}</tr>`;
                }).join('');
              }
              return `<tr>${commonTd(String(idx + 1))}${commonTd(e.entry_date)}${commonTd(e.owner_name)}${commonTd(e.factory_name || '—')}${commonTd(ptLabel)}<td>—</td><td style="text-align:right">—</td>${commonTd(e.guti_type || '—')}${commonTd(Number(e.guti_cost_per_kg) > 0 ? '৳' + Number(e.guti_cost_per_kg) : '—', 'right')}${commonTd(e.carton_no || '—')}${commonTd(String(Number(e.total_input_kg)), 'right')}${commonTd(String(Number(e.total_output_kg)), 'right')}${commonTd(String(Number(e.chhat_kg)), 'right')}${commonTd(String(Number(e.remand_kg)), 'right')}</tr>`;
            }).join("")}</tbody><tfoot><tr class="total-row"><td colspan="10">মোট</td><td style="text-align:right">${tIn}</td><td style="text-align:right">${tOut}</td><td></td><td></td></tr></tfoot></table>`;
          }}
        />
        <div className="space-y-4" id="twobytwo-cards">
          {data.map(e => (
            <div key={e.id} data-card-id={e.id} onClick={() => { const s = new Set(selectedIds); s.has(e.id) ? s.delete(e.id) : s.add(e.id); setSelectedIds(s); }} className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedIds.has(e.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(e.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                    {selectedIds.has(e.id) && <span className="text-xs">✓</span>}
                  </div>
                  <Scissors className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.owner_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.entry_date} · <span className={`px-1.5 py-0.5 rounded-full ${e.product_type === "kachi" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{getProductLabel(e.product_type)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {e.carton_no && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">কার্টুন: {e.carton_no}</span>}
                      {e.factory_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">কারখানা: {e.factory_name}</span>}
                      {e.guti_type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">গুটি: {e.guti_type}</span>}
                      {e.guti_cost_per_kg > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">গুটির পড়ন: ৳{e.guti_cost_per_kg}/KG</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {can_edit && <button onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                  {can_delete && <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                </div>
              </div>

              {/* Grade breakdown table */}
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                    <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("weight")} (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {e.grade_details.map((g, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs font-mono text-foreground">{g.grade}</td>
                      <td className="py-2 text-xs text-right text-foreground">{g.kg} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary row */}
              <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                <span className="text-foreground">{t("totalInput")}: <strong>{Number(e.total_input_kg)} KG</strong></span>
                <span className="text-success">{t("totalOutput")}: <strong>{Number(e.total_output_kg)} KG</strong></span>
                <span className="text-destructive">{t("chhat")}: <strong>{Number(e.chhat_kg)} KG</strong></span>
                <span className="text-warning">{t("remand")}: <strong>{Number(e.remand_kg)} KG</strong></span>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default TwoByTwoStockModule;
