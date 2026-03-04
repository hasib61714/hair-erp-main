import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ChallanPrint from "@/components/ChallanPrint";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type GradeDetail = { grade: string; kg: number; rate: number };
type Challan = {
  id: string; challan_no: string; challan_date: string; buyer_name: string; buyer_country: string;
  product_type: string; grade_details: GradeDetail[]; total_amount: number; advance_amount: number | null; due_amount: number | null;
};

const countryOptions = [
  { value: "BD", labelKey: "bangladesh" as const, flag: "🇧🇩" },
  { value: "IN", labelKey: "india" as const, flag: "🇮🇳" },
  { value: "CN", labelKey: "china" as const, flag: "🇨🇳" },
  { value: "OTHER", labelKey: "otherCountry" as const, flag: "🌍" },
];

const ChallanModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings: company } = useCompanySettings();
  const { can_edit, can_delete } = usePermissions("challan");
  const [data, setData] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [printChallan, setPrintChallan] = useState<Challan | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [challanNo, setChallanNo] = useState(""); const [buyerName, setBuyerName] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("BD");
  const [challanProductType, setChallanProductType] = useState("two_by_two");
  const [advanceAmt, setAdvanceAmt] = useState(""); const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [gradeRows, setGradeRows] = useState<GradeDetail[]>([{ grade: '12"', kg: 0, rate: 0 }]);
  const [gutiWeightKg, setGutiWeightKg] = useState("");

  const fetchData = async () => {
    const { data: rows } = await supabase.from("challans").select("*").order("challan_date", { ascending: false });
    setData((rows || []).map(r => ({ ...r, grade_details: (r.grade_details || []) as unknown as GradeDetail[], buyer_country: (r as any).buyer_country || "BD", product_type: (r as any).product_type || "two_by_two" })));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setChallanNo(""); setBuyerName(""); setBuyerCountry("BD"); setChallanProductType("two_by_two"); setAdvanceAmt(""); setChallanDate(new Date().toISOString().split("T")[0]);
    setGradeRows([{ grade: '12"', kg: 0, rate: 0 }]); setGutiWeightKg(""); setEditId(null); setShowForm(false);
  };

  const isGuti = challanProductType === "guti";
  const totalCalc = isGuti ? 0 : gradeRows.reduce((s, g) => s + g.kg * g.rate, 0);
  const totalKg = isGuti ? (parseFloat(gutiWeightKg) || 0) : gradeRows.reduce((s, g) => s + g.kg, 0);

  const handleSave = async () => {
    if (!buyerName) return;
    // Auto-generate challan number if empty
    let finalChallanNo = challanNo;
    if (!finalChallanNo && !editId) {
      const { data: nextNum } = await supabase.rpc("get_next_number", { counter_id: "challan" });
      finalChallanNo = nextNum || `CH-${Date.now()}`;
    }
    if (!finalChallanNo) return;
    if (isGuti && !parseFloat(gutiWeightKg)) return;
    if (!isGuti && totalKg === 0) return;
    const adv = parseFloat(advanceAmt) || 0;
    const gDetails = isGuti ? [{ grade: "গুটি", kg: parseFloat(gutiWeightKg) || 0, rate: 0 }] : gradeRows;
    const total = isGuti ? 0 : totalCalc;
    const payload = {
      challan_no: finalChallanNo, buyer_name: buyerName, buyer_country: buyerCountry, product_type: challanProductType, challan_date: challanDate,
      grade_details: gDetails as any, total_amount: total, advance_amount: adv, due_amount: total - adv,
    };

    if (editId) {
      const { error } = await supabase.from("challans").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("challans").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (c: Challan) => {
    setEditId(c.id); setChallanNo(c.challan_no); setBuyerName(c.buyer_name); setBuyerCountry(c.buyer_country || "BD"); setChallanProductType(c.product_type || "two_by_two");
    setAdvanceAmt(String(c.advance_amount || 0)); setChallanDate(c.challan_date);
    if (c.product_type === "guti" && c.grade_details.length > 0) {
      setGutiWeightKg(String(c.grade_details[0]?.kg || 0));
    } else {
      setGradeRows(c.grade_details.length > 0 ? c.grade_details : [{ grade: '12"', kg: 0, rate: 0 }]);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই চালান মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("challans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  const updateGradeRow = (i: number, field: keyof GradeDetail, val: string | number) => {
    const copy = [...gradeRows]; copy[i] = { ...copy[i], [field]: field === "grade" ? val : Number(val) }; setGradeRows(copy);
  };

  const getCountryLabel = (code: string) => {
    const c = countryOptions.find(o => o.value === code);
    return c ? `${c.flag} ${t(c.labelKey)}` : code;
  };

  const handlePrint = (c: Challan) => {
    setPrintChallan(c);
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;
      const win = window.open("", "_blank");
      if (!win) { toast.error("Popup blocked"); return; }
      win.document.write(`<!DOCTYPE html><html><head><title>Challan ${c.challan_no}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #000; position: relative; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.06; pointer-events: none; z-index: 0; }
          .watermark img { max-width: 400px; max-height: 400px; }
          .content { position: relative; z-index: 1; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; letter-spacing: 2px; }
          .header p { font-size: 11px; color: #666; margin-top: 4px; }
          .title { text-align: center; margin-bottom: 24px; }
          .title h2 { font-size: 16px; border: 1px solid #000; display: inline-block; padding: 4px 24px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; }
          .info .right { text-align: right; }
          .info p { margin-bottom: 4px; }
          .info .label { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 8px 12px; }
          th { background: #f0f0f0; text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: 700; }
          .summary { border: 1px solid #000; padding: 16px; margin-bottom: 32px; font-size: 13px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .summary-row.total { border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; font-weight: 700; font-size: 16px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 64px; font-size: 13px; }
          .sig-block { text-align: center; }
          .sig-line { border-top: 1px solid #000; width: 160px; margin-bottom: 4px; }
          .sig-sub { font-size: 10px; color: #888; }
          .footer { text-align: center; font-size: 9px; color: #aaa; margin-top: 48px; border-top: 1px solid #ddd; padding-top: 8px; }
          @media print { body { padding: 20px; } .watermark { position: fixed; } }
        </style>
      </head><body>
        ${company.logo_url ? `<div class="watermark"><img src="${company.logo_url}" alt="Watermark" /></div>` : ""}
        <div class="content">
        <div class="header">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-height:60px;margin:0 auto 8px;display:block;" />` : ""}
          <h1>${company.company_name.toUpperCase()}</h1>
          <p>${company.tagline}</p>
          <p>${company.company_address}</p>
          ${company.company_phone ? `<p>Phone: ${company.company_phone}</p>` : ""}
        </div>
        <div class="title"><h2>চালান / CHALLAN</h2></div>
        <div class="info">
          <div><p><span class="label">চালান নং / Challan No:</span> ${c.challan_no}</p><p><span class="label">তারিখ / Date:</span> ${c.challan_date}</p></div>
          <div class="right"><p><span class="label">বায়ার / Buyer:</span> ${c.buyer_name}</p><p><span class="label">দেশ / Country:</span> ${{"BD":"Bangladesh","IN":"India","CN":"China","OTHER":"Other"}[c.buyer_country] || c.buyer_country}</p><p><span class="label">পণ্য / Product:</span> ${{"guti":"গুটি / Guti","kachi":"কাছি / Kachi","two_by_two":"টু বাই টু / Two by Two"}[c.product_type] || c.product_type}</p></div>
        </div>
        <table>
          <thead><tr><th>ক্রম</th><th>গ্রেড / Grade</th><th class="right">ওজন / KG</th><th class="right">দর / Rate (৳)</th><th class="right">মোট / Amount (৳)</th></tr></thead>
          <tbody>${c.grade_details.map((g, i) => `<tr><td>${i + 1}</td><td>${g.grade}</td><td class="right">${g.kg}</td><td class="right">৳${g.rate.toLocaleString()}</td><td class="right bold">৳${(g.kg * g.rate).toLocaleString()}</td></tr>`).join("")}</tbody>
          <tfoot><tr class="bold"><td colspan="2">মোট / Total</td><td class="right">${c.grade_details.reduce((s, g) => s + g.kg, 0)} KG</td><td></td><td class="right">৳${Number(c.total_amount).toLocaleString()}</td></tr></tfoot>
        </table>
        <div class="summary">
          <div class="summary-row"><span>মোট মূল্য / Total Amount:</span><span class="bold">৳${Number(c.total_amount).toLocaleString()}</span></div>
          <div class="summary-row"><span>অগ্রিম / Advance:</span><span>৳${Number(c.advance_amount || 0).toLocaleString()}</span></div>
          <div class="summary-row total"><span>বকেয়া / Due:</span><span>৳${Number(c.due_amount || 0).toLocaleString()}</span></div>
        </div>
        <div class="signatures">
          <div class="sig-block"><div class="sig-line"></div><p>বিক্রেতার স্বাক্ষর</p><p class="sig-sub">Seller's Signature</p></div>
          <div class="sig-block"><div class="sig-line"></div><p>ক্রেতার স্বাক্ষর</p><p class="sig-sub">Buyer's Signature</p></div>
        </div>
        <div class="footer">${company.company_name} — Computer Generated Challan</div>
        </div>
      </body></html>`);
      win.document.close();
      win.focus();
      win.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("challanModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("challanHistory")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("createChallan")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("createChallan")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("challanNo")}</label>
              <input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="অটো জেনারেট হবে" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerName")}</label>
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerCountry")}</label>
              <select value={buyerCountry} onChange={e => setBuyerCountry(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {countryOptions.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("productType")}</label>
              <select value={challanProductType} onChange={e => setChallanProductType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="guti">{t("gutiProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
                <option value="two_by_two">{t("twobytwoProduct")}</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          {isGuti ? (
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">{t("weight")}</label>
              <input type="number" value={gutiWeightKg} onChange={e => setGutiWeightKg(e.target.value)} placeholder="মোট কেজি" className="w-full max-w-xs h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">{t("gradeDetails")}</p>
              {gradeRows.map((gr, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 mb-2">
                  <select value={gr.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                    {['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'].map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input type="number" placeholder="KG" value={gr.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  <input type="number" placeholder="Rate" value={gr.rate || ""} onChange={e => updateGradeRow(i, "rate", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                </div>
              ))}
              <button onClick={() => setGradeRows([...gradeRows, { grade: '12"', kg: 0, rate: 0 }])} className="text-xs text-primary mb-4">+ Add Grade Row</button>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("advance")}</label>
              <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-end"><p className="text-sm text-foreground">
              {isGuti ? `${t("total")}: ${totalKg} KG` : `${t("total")}: ৳${totalCalc.toLocaleString()} | ${t("due")}: ৳${(totalCalc - (parseFloat(advanceAmt) || 0)).toLocaleString()}`}
            </p></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
        <>
        <PrintToolbar
          moduleName={t("challanModule")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="challan_date"
          cardContainerId="challan-cards"
          renderPrintTable={(items) => {
            const total = items.reduce((s: number, c: any) => s + Number(c.total_amount), 0);
            const due = items.reduce((s: number, c: any) => s + Number(c.due_amount || 0), 0);
            return `<table><thead><tr><th>চালান নং</th><th>বায়ার</th><th>তারিখ</th><th>পণ্য</th><th>গ্রেড বিবরণ</th><th style="text-align:right">মোট (৳)</th><th style="text-align:right">অগ্রিম (৳)</th><th style="text-align:right">বকেয়া (৳)</th></tr></thead><tbody>${items.map((c: any) => {
              const grades = (c.grade_details || []) as Array<{grade: string; kg: number; rate: number}>;
              const gradeText = grades.map((g: any) => `${g.grade}: ${g.kg} KG × ৳${Number(g.rate).toLocaleString()}`).join('<br/>');
              return `<tr><td>${c.challan_no}</td><td>${c.buyer_name}</td><td>${c.challan_date}</td><td>${c.product_type}</td><td style="font-size:11px;line-height:1.6">${gradeText}</td><td style="text-align:right">৳${Number(c.total_amount).toLocaleString()}</td><td style="text-align:right">৳${Number(c.advance_amount || 0).toLocaleString()}</td><td style="text-align:right">৳${Number(c.due_amount || 0).toLocaleString()}</td></tr>`;
            }).join("")}</tbody><tfoot><tr class="total-row"><td colspan="5">মোট</td><td style="text-align:right">৳${total.toLocaleString()}</td><td></td><td style="text-align:right">৳${due.toLocaleString()}</td></tr></tfoot></table>`;
          }}
        />
        <div className="space-y-4" id="challan-cards">
          {data.map(c => (
            <div key={c.id} data-card-id={c.id} className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.challan_no} — {c.buyer_name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.challan_date} · {getCountryLabel(c.buyer_country)} · <span className={`px-1.5 py-0.5 rounded-full ${c.product_type === "guti" ? "bg-info/15 text-info" : c.product_type === "kachi" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{c.product_type === "guti" ? t("gutiProduct") : c.product_type === "kachi" ? t("kachiProduct") : t("twobytwoProduct")}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePrint(c)} className="p-1 rounded hover:bg-secondary" title="Print"><Printer className="w-4 h-4 text-primary" /></button>
                  {can_edit && <button onClick={() => handleEdit(c)} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                  {can_delete && <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                </div>
              </div>
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{t("grade")}</th>
                    <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("weight")}</th>
                    <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-3">{t("rate")}</th>
                    <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("totalPrice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.grade_details.map((g, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs font-mono text-foreground">{g.grade}</td>
                      <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                      <td className="py-2 pr-3 text-xs text-right text-foreground">৳{g.rate.toLocaleString()}</td>
                      <td className="py-2 text-xs text-right font-medium text-foreground">৳{(g.kg * g.rate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-6 text-xs pt-2 border-t border-border">
                <span className="text-foreground font-medium">{t("total")}: ৳{Number(c.total_amount).toLocaleString()}</span>
                <span className="text-success">{t("advance")}: ৳{Number(c.advance_amount || 0).toLocaleString()}</span>
                <span className="text-destructive font-medium">{t("due")}: ৳{Number(c.due_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default ChallanModule;
