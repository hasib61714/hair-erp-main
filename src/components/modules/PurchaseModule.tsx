import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import TransactionDrawer from "@/components/TransactionDrawer";
import PrintToolbar from "@/components/PrintToolbar";
type GradeDetail = { grade: string; kg: number; rate: number };
type Purchase = {
  id: string; purchase_date: string; supplier_name: string; country: string; currency: string;
  weight_kg: number; price_per_kg: number; total_price: number; exchange_rate: number | null;
  middleman_name: string | null; payment_status: string; guti_grade: string | null;
  product_type: string; grade_details: GradeDetail[];
  bata_rate: number | null; bdt_paid: number | null;
};

const statusStyles: Record<string, string> = {
  paid: "bg-success/15 text-success",
  unpaid: "bg-destructive/15 text-destructive",
  partial: "bg-warning/15 text-warning",
};

const countryOptions = [
  { value: "BD", labelKey: "bangladesh" as const, flag: "🇧🇩", currency: "BDT" },
  { value: "IN", labelKey: "india" as const, flag: "🇮🇳", currency: "INR" },
  { value: "CN", labelKey: "china" as const, flag: "🇨🇳", currency: "CNY" },
  { value: "OTHER", labelKey: "otherCountry" as const, flag: "🌍", currency: "USD" },
];

const gradeOptions = ['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'];

const PurchaseModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("purchase");
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [country, setCountry] = useState("BD");
  const [supplierName, setSupplierName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [middlemanName, setMiddlemanName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [gutiGrade, setGutiGrade] = useState("");
  const [purchaseProductType, setPurchaseProductType] = useState("guti");
  const [bataRate, setBataRate] = useState("");
  const [bdtPaid, setBdtPaid] = useState("");
  const [gradeRows, setGradeRows] = useState<GradeDetail[]>([{ grade: '12"', kg: 0, rate: 0 }]);

  const fetchData = async () => {
    const { data: rows } = await supabase.from("purchases").select("*").order("purchase_date", { ascending: false });
    setData((rows || []).map(r => ({
      ...r,
      guti_grade: (r as any).guti_grade || "",
      grade_details: ((r as any).grade_details || []) as GradeDetail[],
    })));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSupplierName(""); setWeightKg(""); setPricePerKg(""); setExchangeRate("1");
    setMiddlemanName(""); setCountry("BD"); setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPaymentStatus("unpaid"); setGutiGrade(""); setPurchaseProductType("guti"); setEditId(null); setShowForm(false);
    setBataRate(""); setBdtPaid(""); setGradeRows([{ grade: '12"', kg: 0, rate: 0 }]);
  };

  const getCountryInfo = (code: string) => countryOptions.find(c => c.value === code) || countryOptions[0];

  const useGradeRows = purchaseProductType === "kachi" || purchaseProductType === "two_by_two";
  const gradeTotal = gradeRows.reduce((s, g) => s + g.kg * g.rate, 0);
  const gradeTotalKg = gradeRows.reduce((s, g) => s + g.kg, 0);

  const updateGradeRow = (i: number, field: keyof GradeDetail, val: string | number) => {
    const copy = [...gradeRows]; copy[i] = { ...copy[i], [field]: field === "grade" ? val : Number(val) }; setGradeRows(copy);
  };

  const handleSave = async () => {
    if (useGradeRows) {
      if (!supplierName || gradeTotalKg === 0) return;
    } else {
      const w = parseFloat(weightKg); const p = parseFloat(pricePerKg);
      if (!supplierName || !w || !p) return;
    }

    const w = useGradeRows ? gradeTotalKg : parseFloat(weightKg);
    const p = useGradeRows ? (gradeTotalKg > 0 ? gradeTotal / gradeTotalKg : 0) : parseFloat(pricePerKg);
    const total = useGradeRows ? gradeTotal : w * p;
    const info = getCountryInfo(country);
    const exRate = country !== "BD" ? parseFloat(exchangeRate) || 1 : 1;

    const payload: any = {
      supplier_name: supplierName, country, currency: info.currency, weight_kg: w, price_per_kg: p,
      total_price: total, exchange_rate: exRate, middleman_name: middlemanName || null,
      purchase_date: purchaseDate, payment_status: paymentStatus, guti_grade: gutiGrade || null,
      product_type: purchaseProductType,
      bata_rate: bataRate ? parseFloat(bataRate) : null,
      bdt_paid: bdtPaid ? parseFloat(bdtPaid) : null,
      grade_details: useGradeRows ? gradeRows : [],
    };

    if (editId) {
      const { error } = await supabase.from("purchases").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("purchases").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (p: Purchase) => {
    setEditId(p.id); setSupplierName(p.supplier_name); setCountry(p.country);
    setWeightKg(String(p.weight_kg)); setPricePerKg(String(p.price_per_kg));
    setExchangeRate(String(p.exchange_rate || 1)); setMiddlemanName(p.middleman_name || "");
    setPurchaseDate(p.purchase_date); setPaymentStatus(p.payment_status);
    setGutiGrade(p.guti_grade || ""); setPurchaseProductType(p.product_type || "guti");
    setBataRate(String(p.bata_rate || "")); setBdtPaid(String(p.bdt_paid || ""));
    setGradeRows(p.grade_details?.length > 0 ? p.grade_details : [{ grade: '12"', kg: 0, rate: 0 }]);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const getCurrencySymbol = (cur: string) => {
    const map: Record<string, string> = { BDT: "৳", INR: "₹", CNY: "¥", USD: "$" };
    return map[cur] || cur;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("purchaseModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("multiCurrencySupport")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("addNewPurchase")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addNewPurchase")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("productType")}</label>
              <select value={purchaseProductType} onChange={e => setPurchaseProductType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="guti">{t("gutiProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
                <option value="two_by_two">{t("twobytwoProduct")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("supplierName")}</label>
              <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("country")}</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {countryOptions.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)} ({c.currency})</option>)}
              </select>
            </div>
            {purchaseProductType === "guti" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("gutiGrade")}</label>
                <input value={gutiGrade} onChange={e => setGutiGrade(e.target.value)} placeholder="e.g. A-Grade, B-Grade, Mixed" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
            {!useGradeRows && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("weight")}</label>
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("pricePerKg")}</label>
                  <input type="number" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </>
            )}
            {country !== "BD" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("exchangeRate")}</label>
                  <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                {country === "IN" && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("bataRate")}</label>
                      <input type="number" step="0.01" value={bataRate} onChange={e => setBataRate(e.target.value)} placeholder="যেমন: 0.75" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("bdtPaid")}</label>
                      <input type="number" value={bdtPaid} onChange={e => setBdtPaid(e.target.value)} placeholder="বাংলা টাকায় কত দিলেন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </>
                )}
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("middlemanName")}</label>
              <input value={middlemanName} onChange={e => setMiddlemanName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("paymentStatus")}</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="unpaid">{t("unpaid")}</option>
                <option value="paid">{t("paid")}</option>
                <option value="partial">{t("partial")}</option>
              </select>
            </div>
          </div>

          {useGradeRows && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">{t("gradeDetails")}</p>
              {gradeRows.map((gr, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-2">
                  <select value={gr.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                    {gradeOptions.map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input type="number" placeholder="KG" value={gr.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  <input type="number" placeholder={t("rate")} value={gr.rate || ""} onChange={e => updateGradeRow(i, "rate", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  {gradeRows.length > 1 && (
                    <button onClick={() => setGradeRows(gradeRows.filter((_, j) => j !== i))} className="h-9 w-9 rounded-lg border border-destructive/30 flex items-center justify-center hover:bg-destructive/10 transition-colors">
                      <Minus className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setGradeRows([...gradeRows, { grade: '12"', kg: 0, rate: 0 }])} className="text-xs text-primary hover:underline mb-2">+ {t("gradeDetails")}</button>
              <p className="text-xs text-foreground mt-1">{t("total")}: {gradeTotalKg} KG | ৳{gradeTotal.toLocaleString()}</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("purchaseHistory")}</h3>
        <PrintToolbar
          moduleName={t("purchaseHistory")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="purchase_date"
          cardContainerId="purchase-cards"
          renderPrintTable={(items) => {
            const totalPrice = items.reduce((s: number, p: any) => s + Number(p.total_price), 0);
            return `<table><thead><tr><th>${t("date")}</th><th>${t("supplier")}</th><th>${t("productType")}</th><th>গ্রেড বিবরণ</th><th>${t("country")}</th><th style="text-align:right">${t("weight")}</th><th style="text-align:right">${t("totalPrice")}</th><th>${t("status")}</th></tr></thead>
            <tbody>${items.map((p: any) => {
              const grades = (p.grade_details || []) as Array<{grade: string; kg: number; rate: number}>;
              const ptLabel = p.product_type === "guti" ? "গুটি" : p.product_type === "kachi" ? "কাচি" : "টু বাই টু";
              const sym = p.currency === "INR" ? "₹" : p.currency === "CNY" ? "¥" : "৳";
              let gradeText = "";
              if (grades.length > 0) {
                gradeText = grades.map((g: any) => `${g.grade}: ${g.kg} KG × ${sym}${Number(g.rate).toLocaleString()} = ${sym}${(g.kg * g.rate).toLocaleString()}`).join('<br/>');
              } else if (p.product_type === "guti") {
                gradeText = `${p.weight_kg} KG × ${sym}${Number(p.price_per_kg).toLocaleString()}`;
                if (p.guti_grade) gradeText += `<br/><small>ধরন: ${p.guti_grade}</small>`;
              } else {
                gradeText = `${p.weight_kg} KG × ${sym}${Number(p.price_per_kg).toLocaleString()}`;
              }
              return `<tr><td>${p.purchase_date}</td><td>${p.supplier_name}</td><td>${ptLabel}</td><td style="font-size:11px;line-height:1.6">${gradeText}</td><td>${p.country}</td><td style="text-align:right">${p.weight_kg} KG</td><td style="text-align:right">${sym}${Number(p.total_price).toLocaleString()}</td><td>${p.payment_status === "paid" ? "পরিশোধিত" : p.payment_status === "partial" ? "আংশিক" : "বাকি"}</td></tr>`;
            }).join("")}
            <tr class="total-row"><td colspan="5">${t("total")}</td><td></td><td style="text-align:right">৳${totalPrice.toLocaleString()}</td><td></td></tr>
            </tbody></table>`;
          }}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
           <div className="space-y-4" id="purchase-cards">
            {data.map(p => {
              const sym = getCurrencySymbol(p.currency);
              const cInfo = countryOptions.find(c => c.value === p.country);
              const hasGrades = p.grade_details && p.grade_details.length > 0;
              const ptLabel = p.product_type === "guti" ? t("gutiProduct") : p.product_type === "kachi" ? t("kachiProduct") : t("twobytwoProduct");
              return (
                <div key={p.id} data-card-id={p.id} onClick={() => { const s = new Set(selectedIds); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelectedIds(s); }} className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedIds.has(p.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(p.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {selectedIds.has(p.id) && <span className="text-xs">✓</span>}
                      </div>
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          <button onClick={(ev) => { ev.stopPropagation(); setDrawerName(p.supplier_name); setDrawerOpen(true); }} className="text-primary hover:underline cursor-pointer">{p.supplier_name}</button>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.purchase_date} · <span className={`px-1.5 py-0.5 rounded-full ${p.product_type === "guti" ? "bg-info/15 text-info" : p.product_type === "kachi" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{ptLabel}</span>
                          {' '}<span className={`px-1.5 py-0.5 rounded-full ${statusStyles[p.payment_status] || ""}`}>{t(p.payment_status as any)}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{cInfo?.flag || "🌍"} {p.currency}</span>
                          {p.middleman_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">দালাল: {p.middleman_name}</span>}
                          {p.guti_grade && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">গ্রেড: {p.guti_grade}</span>}
                          {p.bata_rate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">বাটা: {sym}{p.bata_rate}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {can_edit && <button onClick={(ev) => { ev.stopPropagation(); handleEdit(p); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                      {can_delete && <button onClick={(ev) => { ev.stopPropagation(); handleDelete(p.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                    </div>
                  </div>

                  {/* Grade breakdown table */}
                  <table className="w-full text-sm mb-3">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("weight")} (KG)</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("rate")} ({sym})</th>
                        <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("total")} ({sym})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasGrades ? p.grade_details.map((g, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs font-medium text-foreground">{g.grade}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{sym}{Number(g.rate).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">{sym}{(g.kg * g.rate).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr className="border-b border-border/30">
                          <td className="py-2 pr-3 text-xs text-foreground">{p.guti_grade || "—"}</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{p.weight_kg} KG</td>
                          <td className="py-2 pr-3 text-xs text-right text-foreground">{sym}{Number(p.price_per_kg).toLocaleString()}</td>
                          <td className="py-2 text-xs text-right font-medium text-foreground">{sym}{Number(p.total_price).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                    <span className="text-foreground">মোট ওজন: <strong>{p.weight_kg} KG</strong></span>
                    <span className="text-primary">মোট মূল্য: <strong>{sym}{Number(p.total_price).toLocaleString()}</strong></span>
                    {p.exchange_rate && p.exchange_rate !== 1 && <span className="text-muted-foreground">এক্সচেঞ্জ: {p.exchange_rate}</span>}
                    {p.bdt_paid && <span className="text-success">BDT পেইড: <strong>৳{Number(p.bdt_paid).toLocaleString()}</strong></span>}
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
        personType="supplier"
      />
    </div>
  );
};

export default PurchaseModule;
