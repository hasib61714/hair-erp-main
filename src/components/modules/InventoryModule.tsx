import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Pencil, Plus, Trash2, X, Factory, Check,
  Scissors, Search, Filter,
} from "lucide-react";
import PrintToolbar from "@/components/PrintToolbar";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type InventoryRow = {
  id: string; grade: string; stock_kg: number; rate_per_kg: number;
  factory_id: string | null; product_type: string;
};
type FactoryRow = { id: string; name: string; location: string; factory_type: string };
type GradeRow   = { grade: string; kg: string; rate: string };

const PRODUCT_TYPES = [
  { value: "guti",        labelKey: "gutiProduct"     as const },
  { value: "kachi",       labelKey: "kachiProduct"    as const },
  { value: "two_by_two",  labelKey: "twobytwoProduct" as const },
];

const GRADES = ['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'];

const PRODUCT_BADGE: Record<string, string> = {
  guti:       "bg-amber-500/10 text-amber-600 border-amber-500/20",
  kachi:      "bg-blue-500/10 text-blue-600 border-blue-500/20",
  two_by_two: "bg-success/10 text-success border-success/20",
};

// ── Data fetching ──────────────────────────────────────────────────
const fetchInventory = async () => {
  const [{ data: inv }, { data: facs }] = await Promise.all([
    supabase.from("inventory").select("*").order("grade"),
    supabase.from("factories").select("id, name, location, factory_type"),
  ]);
  return { inventory: inv ?? [], factories: facs ?? [] };
};

// ── Add entry form ─────────────────────────────────────────────────
const AddEntryForm = ({
  factories,
  onSaved,
  onCancel,
  t,
}: {
  factories: FactoryRow[];
  onSaved: () => void;
  onCancel: () => void;
  t: (k: string) => string;
}) => {
  const [productType, setProductType] = useState("two_by_two");
  const [newFactory,  setNewFactory]  = useState("");
  const [newGrade,    setNewGrade]    = useState("");
  const [newStock,    setNewStock]    = useState("");
  const [newRate,     setNewRate]     = useState("");
  const [gradeRows,   setGradeRows]   = useState<GradeRow[]>([{ grade: '6"', kg: "", rate: "" }]);
  const [saving, setSaving] = useState(false);

  const isMultiGrade = productType === "kachi" || productType === "two_by_two";

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (isMultiGrade) {
        const valid = gradeRows.filter(r => r.kg && parseFloat(r.kg) > 0);
        if (valid.length === 0) { toast.error("Add at least one grade entry"); return; }
        const { error } = await supabase.from("inventory").insert(
          valid.map(r => ({
            grade: r.grade, stock_kg: parseFloat(r.kg) || 0,
            rate_per_kg: parseFloat(r.rate) || 0,
            factory_id: newFactory || null, product_type: productType,
          }))
        );
        if (error) { toast.error(error.message); return; }
      } else {
        if (!newGrade.trim()) { toast.error("Grade is required"); return; }
        const { error } = await supabase.from("inventory").insert({
          grade: newGrade.trim(), stock_kg: parseFloat(newStock) || 0,
          rate_per_kg: parseFloat(newRate) || 0,
          factory_id: newFactory || null, product_type: productType,
        });
        if (error) { toast.error(error.message); return; }
      }
      toast.success(t("saved"));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/3 p-5 space-y-4 animate-slide-up">
      <h3 className="text-sm font-semibold text-foreground">{t("addEntry")}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-label mb-1.5 block">{t("productType")}</label>
          <select
            value={productType}
            onChange={e => { setProductType(e.target.value); setGradeRows([{ grade: '6"', kg: "", rate: "" }]); }}
            aria-label={t("productType")}
            className="input-base"
          >
            {PRODUCT_TYPES.map(p => (
              <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-label mb-1.5 block">{t("factory")}</label>
          <select value={newFactory} onChange={e => setNewFactory(e.target.value)} aria-label={t("factory")} className="input-base">
            <option value="">— {t("factory")}</option>
            {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Single grade (Guti) */}
      {!isMultiGrade && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-label mb-1.5 block">{t("grade")}</label>
            <input value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder='e.g. 6"' className="input-base" />
          </div>
          <div>
            <label className="text-label mb-1.5 block">{t("stock")} (KG)</label>
            <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="0" min="0" className="input-base" />
          </div>
          <div>
            <label className="text-label mb-1.5 block">{t("rate")} (৳/KG)</label>
            <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="0" min="0" className="input-base" />
          </div>
        </div>
      )}

      {/* Multi-grade rows (Kachi / 2×2) */}
      {isMultiGrade && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-label">{t("gradeDetails")}</label>
            <button
              type="button"
              onClick={() => setGradeRows(r => [...r, { grade: '8"', kg: "", rate: "" }])}
              className="btn-ghost h-7 px-2 text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Add row
            </button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_1fr_80px_32px] gap-0 px-3 py-2 bg-secondary/50 border-b border-border">
              <span className="text-label">Grade</span>
              <span className="text-label">Stock (KG)</span>
              <span className="text-label">Rate (৳)</span>
              <span className="text-label text-right">Total</span>
              <span />
            </div>
            {gradeRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr_80px_32px] gap-2 px-3 py-2 border-b border-border/50 last:border-0 items-center">
                <select
                  value={row.grade}
                  onChange={e => setGradeRows(prev => prev.map((r, idx) => idx === i ? { ...r, grade: e.target.value } : r))}
                  aria-label="Grade"
                  className="input-base h-8 text-xs"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="number" placeholder="0" min="0" value={row.kg}
                  onChange={e => setGradeRows(prev => prev.map((r, idx) => idx === i ? { ...r, kg: e.target.value } : r))}
                  className="input-base h-8 text-xs"
                />
                <input
                  type="number" placeholder="0" min="0" value={row.rate}
                  onChange={e => setGradeRows(prev => prev.map((r, idx) => idx === i ? { ...r, rate: e.target.value } : r))}
                  className="input-base h-8 text-xs"
                />
                <span className="text-[11px] text-muted-foreground text-right tabular-nums">
                  {row.kg && row.rate ? `৳${(parseFloat(row.kg) * parseFloat(row.rate)).toLocaleString()}` : "—"}
                </span>
                {gradeRows.length > 1 ? (
                  <button type="button" aria-label="Remove row" onClick={() => setGradeRows(prev => prev.filter((_, idx) => idx !== i))} className="btn-icon w-7 h-7">
                    <X className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold text-foreground text-right">
            Total: {gradeRows.reduce((s, r) => s + (parseFloat(r.kg) || 0), 0)} KG
            &nbsp;·&nbsp;
            ৳{gradeRows.reduce((s, r) => s + (parseFloat(r.kg) || 0) * (parseFloat(r.rate) || 0), 0).toLocaleString()}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleAdd} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : t("save")}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

// ── Main module ────────────────────────────────────────────────────
const InventoryModule = () => {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [showAdd,      setShowAdd]      = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editStock,    setEditStock]    = useState("");
  const [editRate,     setEditRate]     = useState("");
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterType,   setFilterType]   = useState("all");
  const [editFactoryId,   setEditFactoryId]   = useState<string | null>(null);
  const [editFactoryName, setEditFactoryName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
    staleTime: 30_000,
  });

  const inventory = useMemo(() => data?.inventory ?? [], [data]);
  const factories  = useMemo(() => data?.factories ?? [], [data]);

  const getFactoryName = useCallback(
    (id: string | null) => factories.find(f => f.id === id)?.name ?? "—",
    [factories]
  );
  const getProductLabel = (type: string) => {
    const found = PRODUCT_TYPES.find(p => p.value === type);
    return found ? t(found.labelKey) : type;
  };

  // Filter + search
  const filteredData = useMemo(() => {
    return inventory.filter(row => {
      const matchType = filterType === "all" || row.product_type === filterType;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
        row.grade.toLowerCase().includes(q) ||
        getFactoryName(row.factory_id).toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [inventory, filterType, searchQuery, getFactoryName]);

  const totalKg    = filteredData.reduce((s, g) => s + Number(g.stock_kg), 0);
  const totalValue = filteredData.reduce((s, g) => s + Number(g.stock_kg) * Number(g.rate_per_kg), 0);
  const lowCount   = filteredData.filter(g => Number(g.stock_kg) < 5).length;

  // Factory summary (from filtered data)
  const factorySummary = useMemo(() => {
    const map = new Map<string, { name: string; guti: number; kachi: number; two_by_two: number; total: number }>();
    filteredData.forEach(row => {
      const fId   = row.factory_id ?? "__none__";
      const fName = row.factory_id ? getFactoryName(row.factory_id) : "—";
      const prev  = map.get(fId) ?? { name: fName, guti: 0, kachi: 0, two_by_two: 0, total: 0 };
      const kg    = Number(row.stock_kg);
      if (row.product_type === "guti")       prev.guti       += kg;
      else if (row.product_type === "kachi") prev.kachi      += kg;
      else                                   prev.two_by_two += kg;
      prev.total += kg;
      map.set(fId, prev);
    });
    return Array.from(map.entries());
  }, [filteredData, getFactoryName]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["inventory"] });

  const handleSave = async () => {
    if (!editId) return;
    const { error } = await supabase.from("inventory").update({
      stock_kg: parseFloat(editStock) || 0,
      rate_per_kg: parseFloat(editRate) || 0,
    }).eq("id", editId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    setEditId(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted") || "Deleted");
    refresh();
  };

  const handleFactoryNameSave = async () => {
    if (!editFactoryId || !editFactoryName.trim()) return;
    const { error } = await supabase.from("factories").update({ name: editFactoryName.trim() }).eq("id", editFactoryId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    setEditFactoryId(null);
    setEditFactoryName("");
    refresh();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <PageHeader title={t("inventoryModule")} description={t("factoryWiseStock")} icon={Scissors}>
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className={showAdd ? "btn-secondary" : "btn-primary"}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? t("cancel") : t("addEntry")}
        </button>
      </PageHeader>

      {/* Add form */}
      {showAdd && (
        <AddEntryForm
          factories={factories}
          onSaved={() => { setShowAdd(false); refresh(); }}
          onCancel={() => setShowAdd(false)}
          t={t}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-base p-4">
          <p className="text-label mb-1">{t("total")} {t("stock")}</p>
          <p className="text-display text-primary">{Math.round(totalKg)} KG</p>
        </div>
        <div className="card-base p-4">
          <p className="text-label mb-1">{t("totalValuation")}</p>
          <p className="text-display">৳{Math.round(totalValue).toLocaleString()}</p>
        </div>
        <div className="card-base p-4">
          <p className="text-label mb-1">{t("lowStock")}</p>
          <p className={cn("text-display", lowCount > 0 ? "text-destructive" : "text-muted-foreground")}>
            {lowCount} {t("grade")}
          </p>
        </div>
      </div>

      {/* Factory breakdown cards */}
      {!isLoading && factorySummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {factorySummary.map(([fId, summary]) => (
            <div key={fId} className="card-hover p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Factory className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {editFactoryId === fId && fId !== "__none__" ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editFactoryName}
                        onChange={e => setEditFactoryName(e.target.value)}
                        className="input-base h-7 w-28 text-xs"
                        aria-label="Factory name"
                        autoFocus
                      />
                      <button type="button" onClick={handleFactoryNameSave} aria-label="Save" className="btn-icon w-7 h-7">
                        <Check className="w-3.5 h-3.5 text-success" />
                      </button>
                      <button type="button" onClick={() => setEditFactoryId(null)} aria-label="Cancel" className="btn-icon w-7 h-7">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{summary.name}</span>
                  )}
                </div>
                {fId !== "__none__" && editFactoryId !== fId && (
                  <button
                    type="button"
                    onClick={() => { setEditFactoryId(fId); setEditFactoryName(summary.name); }}
                    aria-label="Edit factory name"
                    className="btn-icon w-7 h-7"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {[
                  { label: t("gutiProduct"),    val: summary.guti },
                  { label: t("kachiProduct"),   val: summary.kachi },
                  { label: t("twobytwoProduct"),val: summary.two_by_two },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-caption">{label}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{val} KG</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border/50 pt-1.5 mt-1">
                  <span className="text-xs font-semibold text-primary">{t("total")}</span>
                  <span className="text-xs font-bold text-primary tabular-nums">{summary.total} KG</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail table */}
      <div className="card-base overflow-hidden">
        {/* Toolbar: search + filter + print */}
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search grade / factory…"
              className="input-base pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {["all", "guti", "kachi", "two_by_two"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  filterType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {type === "all" ? "All" : type === "two_by_two" ? "2×2" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <PrintToolbar
              moduleName={t("inventoryModule")}
              data={filteredData}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              dateField="updated_at"
              renderPrintTable={(items: InventoryRow[]) => {
                const tk = items.reduce((s, g) => s + Number(g.stock_kg), 0);
                const tv = items.reduce((s, g) => s + Number(g.stock_kg) * Number(g.rate_per_kg), 0);
                return `<table><thead><tr><th>Grade</th><th>Type</th><th>Factory</th><th>Stock (KG)</th><th>Rate (৳)</th><th>Value (৳)</th></tr></thead><tbody>${items.map(g => `<tr><td>${g.grade}</td><td>${getProductLabel(g.product_type)}</td><td>${getFactoryName(g.factory_id)}</td><td>${g.stock_kg}</td><td>৳${Number(g.rate_per_kg).toLocaleString()}</td><td>৳${(Number(g.stock_kg) * Number(g.rate_per_kg)).toLocaleString()}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>${tk} KG</strong></td><td></td><td><strong>৳${tv.toLocaleString()}</strong></td></tr></tfoot></table>`;
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={Scissors}
              title={searchQuery || filterType !== "all" ? "No matching items" : t("noData")}
              description={searchQuery || filterType !== "all"
                ? "Try adjusting your search or filter"
                : "Click 'Add Entry' above to add inventory"}
              action={
                (searchQuery || filterType !== "all") ? (
                  <button type="button" onClick={() => { setSearchQuery(""); setFilterType("all"); }} className="btn-ghost text-xs">
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="table-header-cell">{t("grade")}</th>
                  <th className="table-header-cell">{t("productType")}</th>
                  <th className="table-header-cell">{t("factory")}</th>
                  <th className="table-header-cell text-right">{t("stock")} (KG)</th>
                  <th className="table-header-cell text-right">{t("rate")} (৳)</th>
                  <th className="table-header-cell text-right">{t("value")} (৳)</th>
                  <th className="table-header-cell text-right">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(g => {
                  const val      = Number(g.stock_kg) * Number(g.rate_per_kg);
                  const isEdit   = editId === g.id;
                  const isLow    = Number(g.stock_kg) < 5;
                  return (
                    <tr key={g.id} className="table-row-hover">
                      <td className="table-cell font-mono font-semibold text-xs">{g.grade}</td>
                      <td className="table-cell">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium", PRODUCT_BADGE[g.product_type] ?? "badge-neutral")}>
                          {getProductLabel(g.product_type)}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-muted-foreground">{getFactoryName(g.factory_id)}</td>
                      <td className="table-cell text-right">
                        {isEdit ? (
                          <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} aria-label="Stock KG" className="input-base h-7 w-20 text-xs text-right ml-auto" />
                        ) : (
                          <span className={cn("tabular-nums text-xs font-medium", isLow && "text-destructive font-semibold")}>
                            {isLow && "⚠ "}{g.stock_kg}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        {isEdit ? (
                          <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} aria-label="Rate per KG" className="input-base h-7 w-20 text-xs text-right ml-auto" />
                        ) : (
                          <span className="tabular-nums text-xs text-muted-foreground">৳{Number(g.rate_per_kg).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="table-cell text-right font-semibold text-xs tabular-nums">
                        ৳{val.toLocaleString()}
                      </td>
                      <td className="table-cell text-right">
                        {isEdit ? (
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={handleSave} className="btn-primary h-7 px-2.5 text-xs">{t("save")}</button>
                            <button type="button" onClick={() => setEditId(null)} className="btn-secondary h-7 px-2.5 text-xs">{t("cancel")}</button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => { setEditId(g.id); setEditStock(String(g.stock_kg)); setEditRate(String(g.rate_per_kg)); }}
                              aria-label="Edit row"
                              className="btn-icon w-7 h-7"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(g.id)}
                              aria-label="Delete row"
                              className="btn-icon w-7 h-7 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/25 bg-primary/3">
                  <td className="table-cell font-bold text-primary" colSpan={3}>{t("total")}</td>
                  <td className="table-cell text-right font-bold text-primary tabular-nums">{Math.round(totalKg)}</td>
                  <td />
                  <td className="table-cell text-right font-bold text-primary tabular-nums">৳{Math.round(totalValue).toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryModule;
