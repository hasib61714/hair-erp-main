import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type GradeDetail = { grade: string; kg: number; rate: number; remarks?: string };
type ChallanNotes = { ri?: number; chhat?: number; giti?: number };
type Challan = {
  id: string; challan_no: string; challan_date: string; buyer_name: string; buyer_country: string;
  product_type: string; grade_details: GradeDetail[]; total_amount: number; advance_amount: number | null; due_amount: number | null;
  description: string | null; notes: ChallanNotes | null;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [challanNo, setChallanNo] = useState(""); const [buyerName, setBuyerName] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("BD");
  const [challanProductType, setChallanProductType] = useState("two_by_two");
  const [advanceAmt, setAdvanceAmt] = useState(""); const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [gradeRows, setGradeRows] = useState<GradeDetail[]>([{ grade: '12"', kg: 0, rate: 0, remarks: "" }]);
  const [gutiWeightKg, setGutiWeightKg] = useState("");
  const [description, setDescription] = useState("");
  const [noteRi, setNoteRi] = useState(""); const [noteChhat, setNoteChhat] = useState(""); const [noteGiti, setNoteGiti] = useState("");

  const fetchData = async () => {
    const { data: rows } = await supabase.from("challans").select("*").order("challan_date", { ascending: false });
    setData((rows ?? []).map(r => ({
      ...r,
      grade_details: Array.isArray(r.grade_details) ? (r.grade_details as unknown as GradeDetail[]) : [],
      buyer_country: r.buyer_country ?? "BD",
      product_type: r.product_type ?? "two_by_two",
      description: (r as any).description ?? null,
      notes: (r as any).notes as ChallanNotes ?? null,
    })));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setChallanNo(""); setBuyerName(""); setBuyerCountry("BD"); setChallanProductType("two_by_two"); setAdvanceAmt(""); setChallanDate(new Date().toISOString().split("T")[0]);
    setGradeRows([{ grade: '12"', kg: 0, rate: 0, remarks: "" }]); setGutiWeightKg(""); setEditId(null); setShowForm(false);
    setDescription(""); setNoteRi(""); setNoteChhat(""); setNoteGiti("");
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
    const notesParsed: ChallanNotes = {};
    if (noteRi) notesParsed.ri = parseFloat(noteRi);
    if (noteChhat) notesParsed.chhat = parseFloat(noteChhat);
    if (noteGiti) notesParsed.giti = parseFloat(noteGiti);
    const payload = {
      challan_no: finalChallanNo, buyer_name: buyerName, buyer_country: buyerCountry, product_type: challanProductType, challan_date: challanDate,
      grade_details: gDetails as unknown as Json, total_amount: total, advance_amount: adv, due_amount: total - adv,
      description: description || null, notes: Object.keys(notesParsed).length ? notesParsed as unknown as Json : null,
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
    setDescription(c.description || "");
    setNoteRi(c.notes?.ri ? String(c.notes.ri) : "");
    setNoteChhat(c.notes?.chhat ? String(c.notes.chhat) : "");
    setNoteGiti(c.notes?.giti ? String(c.notes.giti) : "");
    if (c.product_type === "guti" && c.grade_details.length > 0) {
      setGutiWeightKg(String(c.grade_details[0]?.kg || 0));
    } else {
      setGradeRows(c.grade_details.length > 0 ? c.grade_details : [{ grade: '12"', kg: 0, rate: 0, remarks: "" }]);
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
    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked"); return; }
    const totalKgPrint = c.grade_details.reduce((s, g) => s + g.kg, 0);
    const notes = c.notes || {};
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>চালান ${c.challan_no}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Hind Siliguri',Arial,sans-serif;font-size:13px;color:#000;background:#fff;padding:28px 32px;position:relative}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.05;pointer-events:none;z-index:0}
  .watermark img{max-width:380px}
  .wrap{position:relative;z-index:1;border:2px solid #333;padding:20px}
  /* ---- HEADER ---- */
  .top-bismillah{text-align:center;font-size:14px;font-weight:700;margin-bottom:10px;letter-spacing:.5px}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:14px}
  .header-logo{flex-shrink:0}
  .header-logo img{max-height:72px;max-width:72px;object-fit:contain}
  .header-center{flex:1;text-align:center}
  .header-center .co-name{font-size:22px;font-weight:700;letter-spacing:1px;line-height:1.2}
  .header-center .co-bn{font-size:15px;font-weight:600;margin-top:2px}
  .header-center .co-sub{font-size:11px;color:#444;margin-top:4px;line-height:1.5}
  .header-right{flex-shrink:0;text-align:right;font-size:11px;color:#444;line-height:1.7}
  /* ---- TITLE ROW ---- */
  .title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .challan-badge{border:2px solid #333;padding:4px 20px;font-size:15px;font-weight:700;letter-spacing:1px}
  .title-right{font-size:12px;line-height:1.8}
  .title-right span{font-weight:600}
  /* ---- SERIAL / BUYER ---- */
  .meta-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:8px}
  .meta-row span{font-weight:600}
  /* ---- DESCRIPTION ---- */
  .desc-row{margin-bottom:10px;font-size:12px}
  .desc-row .label{font-weight:600}
  .desc-box{border-bottom:1px solid #888;min-height:20px;padding:2px 4px;display:inline-block;min-width:70%}
  /* ---- TABLE ---- */
  table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12.5px}
  th,td{border:1px solid #555;padding:6px 10px}
  th{background:#f2f2f2;font-weight:700;text-align:center}
  td.ctr{text-align:center}
  td.rt{text-align:right}
  td.bold{font-weight:700}
  /* ---- BOTTOM SECTION ---- */
  .bottom{display:flex;justify-content:space-between;align-items:flex-start;margin-top:4px}
  .notes-left{font-size:12px;line-height:2}
  .notes-left .note-line{display:flex;gap:8px;align-items:center}
  .notes-left .note-val{border-bottom:1px solid #777;min-width:60px;display:inline-block;padding:0 4px}
  .summary-right{border:1px solid #555;min-width:240px}
  .sum-row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #ccc;font-size:12.5px}
  .sum-row:last-child{border-bottom:none}
  .sum-row.total-row{font-weight:700;font-size:14px;background:#f9f9f9}
  /* ---- SIGNATURE ---- */
  .sig-section{margin-top:40px;text-align:right;font-size:12px}
  .sig-line{border-top:1px solid #333;width:180px;margin-left:auto;margin-bottom:4px}
  @media print{body{padding:10px 16px}.wrap{border:2px solid #333}}
</style>
</head><body>
${company.logo_url ? `<div class="watermark"><img src="${company.logo_url}"/></div>` : ""}
<div class="wrap">
  <div class="top-bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
  <div class="header">
    ${company.logo_url ? `<div class="header-logo"><img src="${company.logo_url}" alt="Logo"/></div>` : ""}
    <div class="header-center">
      <div class="co-name">${company.company_name}</div>
      ${company.tagline ? `<div class="co-bn">${company.tagline}</div>` : ""}
      ${company.company_address ? `<div class="co-sub">${company.company_address}</div>` : ""}
    </div>
    <div class="header-right">
      ${company.company_phone ? company.company_phone.split(/[,/]/).map((p: string) => `<div>${p.trim()}</div>`).join("") : ""}
    </div>
  </div>

  <div class="title-row">
    <div class="challan-badge">চালান / Challan</div>
    <div class="title-right">
      <div><span>তারিখ / Date :</span> ${c.challan_date}</div>
      <div><span>চালান নং :</span> ${c.challan_no}</div>
    </div>
  </div>

  <div class="meta-row">
    <div><span>ক্রমিক নং :</span> ${c.challan_no}</div>
    <div><span>বায়ার / Buyer :</span> ${c.buyer_name}</div>
    <div><span>পণ্য / Product :</span> ${{ guti: "গুটি", kachi: "কাছি", two_by_two: "টু বাই টু" }[c.product_type] || c.product_type}</div>
  </div>

  ${c.description ? `<div class="desc-row"><span class="label">বিবরণ / Description :</span> <span class="desc-box">${c.description}</span></div>` : `<div class="desc-row"><span class="label">বিবরণ / Description :</span> <span class="desc-box">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>`}

  <table>
    <thead><tr>
      <th style="width:36px">ক্রম</th>
      <th>সাইজ / Size</th>
      <th>কেজি / KG</th>
      <th>দর / Rate (৳)</th>
      <th>মোট / Total (৳)</th>
      <th>মন্তব্য / Remarks</th>
    </tr></thead>
    <tbody>
      ${c.grade_details.map((g, i) => `<tr>
        <td class="ctr">${i + 1}</td>
        <td class="ctr">${g.grade}</td>
        <td class="ctr">${g.kg}</td>
        <td class="rt">৳${Number(g.rate).toLocaleString()}</td>
        <td class="rt bold">৳${(g.kg * g.rate).toLocaleString()}</td>
        <td>${g.remarks || ""}</td>
      </tr>`).join("")}
      ${Array.from({ length: Math.max(0, 6 - c.grade_details.length) }).map(() => `<tr><td class="ctr">&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="2" class="bold" style="text-align:center">মোট / Total</td>
      <td class="ctr bold">${totalKgPrint} KG</td>
      <td></td>
      <td class="rt bold">৳${Number(c.total_amount).toLocaleString()}</td>
      <td></td>
    </tr></tfoot>
  </table>

  <div class="bottom">
    <div class="notes-left">
      <div class="note-line">রি = <span class="note-val">${notes.ri ?? ""}</span> কেজি</div>
      <div class="note-line">ছাট = <span class="note-val">${notes.chhat ?? ""}</span> কেজি</div>
      <div class="note-line">গিটি = <span class="note-val">${notes.giti ?? ""}</span> কেজি</div>
    </div>
    <div class="summary-right">
      <div class="sum-row"><span>মোট / Total :</span><span class="bold">৳${Number(c.total_amount).toLocaleString()}</span></div>
      <div class="sum-row"><span>অগ্রিম / Advance :</span><span>৳${Number(c.advance_amount || 0).toLocaleString()}</span></div>
      <div class="sum-row total-row"><span>বাকী / Due :</span><span>৳${Number(c.due_amount || 0).toLocaleString()}</span></div>
    </div>
  </div>

  <div class="sig-section">
    <div class="sig-line"></div>
    <div>কর্তৃপক্ষের স্বাক্ষর</div>
    <div style="font-size:11px;color:#666">Authorised Signature</div>
  </div>
</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("challanModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("challanHistory")}</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
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
              <input aria-label="Buyer name" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerCountry")}</label>
              <select aria-label="Buyer country" value={buyerCountry} onChange={e => setBuyerCountry(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {countryOptions.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("productType")}</label>
              <select aria-label="Product type" value={challanProductType} onChange={e => setChallanProductType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="guti">{t("gutiProduct")}</option>
                <option value="kachi">{t("kachiProduct")}</option>
                <option value="two_by_two">{t("twobytwoProduct")}</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input aria-label="Challan date" type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">বিবরণ / Description</label>
            <input aria-label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="পণ্যের বিবরণ লিখুন..." className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
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
                <div key={i} className="grid grid-cols-4 gap-3 mb-2">
                  <select aria-label="Grade" value={gr.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                    {['6"','8"','10"','12"','14"','16"','18"','20"','22"','24"','26"','28"','30"','32"'].map(g => <option key={g}>{g}</option>)}
                  </select>
                  <input type="number" placeholder="KG" value={gr.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  <input type="number" placeholder="Rate" value={gr.rate || ""} onChange={e => updateGradeRow(i, "rate", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                  <input placeholder="মন্তব্য / Remarks" value={gr.remarks || ""} onChange={e => updateGradeRow(i, "remarks", e.target.value)} className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
                </div>
              ))}
              <button type="button" onClick={() => setGradeRows([...gradeRows, { grade: '12"', kg: 0, rate: 0, remarks: "" }])} className="text-xs text-primary mb-4">+ Add Grade Row</button>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("advance")}</label>
              <input aria-label="Advance amount" type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-end"><p className="text-sm text-foreground">
              {isGuti ? `${t("total")}: ${totalKg} KG` : `${t("total")}: ৳${totalCalc.toLocaleString()} | ${t("due")}: ৳${(totalCalc - (parseFloat(advanceAmt) || 0)).toLocaleString()}`}
            </p></div>
          </div>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">নিচের নোট (চালানের বাম কোণে)</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">রি (KG)</label>
                <input aria-label="Ri kg" type="number" value={noteRi} onChange={e => setNoteRi(e.target.value)} placeholder="রি কেজি" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">ছাট (KG)</label>
                <input aria-label="Chhat kg" type="number" value={noteChhat} onChange={e => setNoteChhat(e.target.value)} placeholder="ছাট কেজি" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">গিটি (KG)</label>
                <input aria-label="Giti kg" type="number" value={noteGiti} onChange={e => setNoteGiti(e.target.value)} placeholder="গিটি কেজি" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
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
                  <button type="button" onClick={() => handlePrint(c)} className="p-1 rounded hover:bg-secondary" aria-label="Print challan"><Printer className="w-4 h-4 text-primary" /></button>
                  {can_edit && <button type="button" onClick={() => handleEdit(c)} className="p-1 rounded hover:bg-secondary" aria-label="Edit challan"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                  {can_delete && <button type="button" onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-destructive/10" aria-label="Delete challan"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
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
