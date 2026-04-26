import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Plus, Trash2, X, Factory, Check } from "lucide-react";
import PrintToolbar from "@/components/PrintToolbar";
import { toast } from "sonner";

type InventoryRow = {
  id: string; grade: string; stock_kg: number; rate_per_kg: number; factory_id: string | null; product_type: string;
};
type FactoryRow = { id: string; name: string; location: string; factory_type: string };

const PRODUCT_TYPES = [
  { value: "guti", labelKey: "gutiProduct" as const },
  { value: "kachi", labelKey: "kachiProduct" as const },
  { value: "two_by_two", labelKey: "twobytwoProduct" as const },
];

const InventoryModule = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<InventoryRow[]>([]);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editStock, setEditStock] = useState("");
  const [editRate, setEditRate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newFactory, setNewFactory] = useState("");
  const [newProductType, setNewProductType] = useState("two_by_two");

  // Factory name editing
  const [editFactoryId, setEditFactoryId] = useState<string | null>(null);
  const [editFactoryName, setEditFactoryName] = useState("");

  const fetchData = async () => {
    const [{ data: inv }, { data: f }] = await Promise.all([
      supabase.from("inventory").select("*").order("grade"),
      supabase.from("factories").select("id, name, location, factory_type"),
    ]);
    setData(inv || []); setFactories(f || []); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const getFactoryName = (id: string | null) => factories.find(f => f.id === id)?.name || "—";
  const getProductLabel = (type: string) => {
    const found = PRODUCT_TYPES.find(p => p.value === type);
    return found ? t(found.labelKey) : type;
  };

  const handleSave = async () => {
    if (!editId) return;
    const { error } = await supabase.from("inventory").update({
      stock_kg: parseFloat(editStock) || 0, rate_per_kg: parseFloat(editRate) || 0,
    }).eq("id", editId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); setEditId(null); fetchData();
  };

  const handleAdd = async () => {
    if (!newGrade.trim()) { toast.error("Grade is required"); return; }
    const { error } = await supabase.from("inventory").insert({
      grade: newGrade.trim(),
      stock_kg: parseFloat(newStock) || 0,
      rate_per_kg: parseFloat(newRate) || 0,
      factory_id: newFactory || null,
      product_type: newProductType,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    setShowAdd(false); setNewGrade(""); setNewStock(""); setNewRate(""); setNewFactory(""); setNewProductType("two_by_two");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted") || "Deleted"); fetchData();
  };

  const handleFactoryNameSave = async () => {
    if (!editFactoryId || !editFactoryName.trim()) return;
    const { error } = await supabase.from("factories").update({ name: editFactoryName.trim() }).eq("id", editFactoryId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved")); setEditFactoryId(null); setEditFactoryName(""); fetchData();
  };

  const totalKg = data.reduce((s, g) => s + Number(g.stock_kg), 0);
  const totalValue = data.reduce((s, g) => s + Number(g.stock_kg) * Number(g.rate_per_kg), 0);

  // Group by factory
  const factorySummary = useMemo(() => {
    const map = new Map<string, { name: string; guti: number; kachi: number; two_by_two: number; total: number }>();
    data.forEach(row => {
      const fId = row.factory_id || "__none__";
      const fName = row.factory_id ? getFactoryName(row.factory_id) : "—";
      const existing = map.get(fId) || { name: fName, guti: 0, kachi: 0, two_by_two: 0, total: 0 };
      const kg = Number(row.stock_kg);
      if (row.product_type === "guti") existing.guti += kg;
      else if (row.product_type === "kachi") existing.kachi += kg;
      else existing.two_by_two += kg;
      existing.total += kg;
      map.set(fId, existing);
    });
    return Array.from(map.entries());
  }, [data, factories]);

  const inputClass = "w-full h-8 rounded border border-border bg-secondary/50 px-2 text-xs text-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("inventoryModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("factoryWiseStock")}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? t("cancel") : t("addEntry")}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-primary/30 p-4 bg-gradient-card shadow-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t("addEntry")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{t("grade")}</label>
              <input value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder='e.g. 6"' className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{t("productType")}</label>
              <select value={newProductType} onChange={e => setNewProductType(e.target.value)} className={inputClass}>
                {PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{t(p.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{t("stock")} (KG)</label>
              <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{t("rate")} (৳/KG)</label>
              <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{t("factory")}</label>
              <select value={newFactory} onChange={e => setNewFactory(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAdd} className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {t("save")}
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("total")} {t("stock")}</p>
          <p className="text-2xl font-bold text-primary">{totalKg} KG</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("totalValuation")}</p>
          <p className="text-2xl font-bold text-foreground">৳{totalValue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{t("lowStock")}</p>
          <p className="text-2xl font-bold text-destructive">{data.filter(g => Number(g.stock_kg) < 5).length} {t("grade")}</p>
        </div>
      </div>

      {/* Factory-wise Summary */}
      {!loading && factorySummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factorySummary.map(([fId, summary]) => (
            <div key={fId} className="rounded-xl border border-border p-5 bg-gradient-card shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-primary" />
                  {editFactoryId === fId && fId !== "__none__" ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editFactoryName}
                        onChange={e => setEditFactoryName(e.target.value)}
                        className="h-7 w-32 rounded border border-border bg-secondary/50 px-2 text-xs text-foreground"
                        autoFocus
                      />
                      <button onClick={handleFactoryNameSave} className="p-1 rounded hover:bg-success/10"><Check className="w-3.5 h-3.5 text-success" /></button>
                      <button onClick={() => setEditFactoryId(null)} className="p-1 rounded hover:bg-secondary"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground">{summary.name}</h3>
                  )}
                </div>
                {fId !== "__none__" && editFactoryId !== fId && (
                  <button
                    onClick={() => { setEditFactoryId(fId); setEditFactoryName(summary.name); }}
                    className="p-1 rounded hover:bg-secondary"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{t("gutiProduct")}</span>
                  <span className="text-xs font-medium text-foreground">{summary.guti} KG</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{t("kachiProduct")}</span>
                  <span className="text-xs font-medium text-foreground">{summary.kachi} KG</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{t("twobytwoProduct")}</span>
                  <span className="text-xs font-medium text-foreground">{summary.two_by_two} KG</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                  <span className="text-[11px] font-semibold text-primary">{t("total")}</span>
                  <span className="text-xs font-bold text-primary">{summary.total} KG</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Table */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <PrintToolbar
          moduleName={t("inventoryModule")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="updated_at"
          renderPrintTable={(items) => {
            const tk = items.reduce((s: number, g: any) => s + Number(g.stock_kg), 0);
            const tv = items.reduce((s: number, g: any) => s + Number(g.stock_kg) * Number(g.rate_per_kg), 0);
            return `<table><thead><tr><th>গ্রেড</th><th>পণ্যের ধরন</th><th>কারখানা</th><th style="text-align:right">স্টক (KG)</th><th style="text-align:right">দর (৳)</th><th style="text-align:right">মূল্য (৳)</th></tr></thead><tbody>${items.map((g: any) => `<tr><td>${g.grade}</td><td>${getProductLabel(g.product_type)}</td><td>${getFactoryName(g.factory_id)}</td><td style="text-align:right">${g.stock_kg}</td><td style="text-align:right">৳${Number(g.rate_per_kg).toLocaleString()}</td><td style="text-align:right">৳${(Number(g.stock_kg) * Number(g.rate_per_kg)).toLocaleString()}</td></tr>`).join("")}</tbody><tfoot><tr class="total-row"><td colspan="3">মোট</td><td style="text-align:right">${tk} KG</td><td></td><td style="text-align:right">৳${tv.toLocaleString()}</td></tr></tfoot></table>`;
          }}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">{t("noData")}</p>
            <p className="text-xs text-muted-foreground">উপরের "নতুন এন্ট্রি" বাটনে ক্লিক করে ইনভেন্টরি যোগ করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("productType")}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("factory")}</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("stock")} (KG)</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("rate")} (৳)</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("value")} (৳)</th>
                  <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(g => {
                  const val = Number(g.stock_kg) * Number(g.rate_per_kg);
                  const isEditing = editId === g.id;
                  return (
                    <tr key={g.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 pr-3 text-xs font-mono font-medium text-foreground">{g.grade}</td>
                      <td className="py-3 pr-3 text-xs text-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          g.product_type === "guti" ? "bg-amber-500/10 text-amber-600" :
                          g.product_type === "kachi" ? "bg-blue-500/10 text-blue-600" :
                          "bg-success/10 text-success"
                        }`}>
                          {getProductLabel(g.product_type)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-foreground">{getFactoryName(g.factory_id)}</td>
                      <td className="py-3 pr-3 text-xs text-right">
                        {isEditing ? <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="w-20 h-7 rounded border border-border bg-secondary/50 px-2 text-xs text-foreground text-right" /> : <span className={Number(g.stock_kg) < 5 ? "text-destructive" : "text-foreground"}>{g.stock_kg}</span>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-right">
                        {isEditing ? <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-20 h-7 rounded border border-border bg-secondary/50 px-2 text-xs text-foreground text-right" /> : <span className="text-muted-foreground">৳{Number(g.rate_per_kg).toLocaleString()}</span>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-right font-medium text-foreground">৳{val.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={handleSave} className="px-2 py-1 text-[11px] rounded bg-primary text-primary-foreground">{t("save")}</button>
                            <button onClick={() => setEditId(null)} className="px-2 py-1 text-[11px] rounded border border-border text-muted-foreground">{t("cancel")}</button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditId(g.id); setEditStock(String(g.stock_kg)); setEditRate(String(g.rate_per_kg)); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            <button onClick={() => handleDelete(g.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/30">
                  <td className="py-3 pr-3 text-xs font-bold text-primary" colSpan={3}>{t("total")}</td>
                  <td className="py-3 pr-3 text-xs text-right font-bold text-primary">{totalKg}</td>
                  <td className="py-3 pr-3"></td>
                  <td className="py-3 pr-3 text-xs text-right font-bold text-primary">৳{totalValue.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryModule;
