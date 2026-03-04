import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Package, RotateCcw, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";
import PartySettlementPrint from "@/components/PartySettlementPrint";
import { useCompanySettings } from "@/hooks/useCompanySettings";

type Consignment = {
  id: string; party_name: string; sent_date: string; sent_kg: number;
  total_returned_kg: number; factory_sent_from: string; factory_processed_at: string;
  status: string; notes: string | null; created_at: string;
};

type Return = {
  id: string; consignment_id: string; return_date: string; return_kg: number;
  notes: string | null; created_at: string;
};

type GradeDetail = { grade: string; kg: number; rate: number };

type Settlement = {
  id: string; party_name: string; buyer_rate: number; party_rate: number; margin: number;
  commission: number; total_sales: number; processing_cost: number | null; payable: number | null;
  paid: number | null; due: number | null; status: string; grade_details: any;
  remand_kg: number | null; chhat_kg: number | null; comments: string | null;
  consignment_id: string | null; created_at: string;
};

const GRADES = ["6\"", "8\"", "10\"", "12\"", "14\"", "16\"", "18\"", "20\"", "22\"", "24\"", "26\"", "28\"", "30\"", "32\""];

const PartyModule = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("party");
  const { settings } = useCompanySettings();

  // Tab state
  const [tab, setTab] = useState<"consignment" | "settlement">("consignment");

  // Consignment state
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [returns, setReturns] = useState<Record<string, Return[]>>({});
  const [loadingC, setLoadingC] = useState(true);
  const [showCForm, setShowCForm] = useState(false);
  const [editCId, setEditCId] = useState<string | null>(null);
  const [cPartyName, setCPartyName] = useState("");
  const [cSentKg, setCSentKg] = useState("");
  const [cSentDate, setCSentDate] = useState(new Date().toISOString().split("T")[0]);
  const [cFactoryFrom, setCFactoryFrom] = useState("");
  const [cFactoryAt, setCFactoryAt] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [expandedC, setExpandedC] = useState<string | null>(null);

  // Return form state
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const [rReturnKg, setRReturnKg] = useState("");
  const [rReturnDate, setRReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [rNotes, setRNotes] = useState("");

  // Settlement state
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingS, setLoadingS] = useState(true);
  const [showSForm, setShowSForm] = useState(false);
  const [editSId, setEditSId] = useState<string | null>(null);
  const [selectedSIds, setSelectedSIds] = useState<Set<string>>(new Set());

  // Settlement form fields
  const [sPartyName, setSPartyName] = useState("");
  const [sBuyerRate, setSBuyerRate] = useState("");
  const [sPartyRate, setSPartyRate] = useState("");
  const [sTotalSales, setSTotalSales] = useState("");
  const [sCommission, setSCommission] = useState("");
  const [sProcessingCost, setSProcessingCost] = useState("");
  const [sPaid, setSPaid] = useState("");
  const [sGradeDetails, setSGradeDetails] = useState<GradeDetail[]>([{ grade: "6\"", kg: 0, rate: 0 }]);
  const [sRemandKg, setSRemandKg] = useState("");
  const [sChhatKg, setSChhatKg] = useState("");
  const [sComments, setSComments] = useState("");
  const [sConsignmentId, setSConsignmentId] = useState("");

  // Print state
  const [printSettlement, setPrintSettlement] = useState<Settlement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch consignments
  const fetchConsignments = async () => {
    const { data } = await supabase.from("party_consignments").select("*").order("created_at", { ascending: false });
    setConsignments((data as any[]) || []);
    setLoadingC(false);

    // Fetch returns for all consignments
    if (data && data.length > 0) {
      const ids = data.map((c: any) => c.id);
      const { data: rets } = await supabase.from("party_returns").select("*").in("consignment_id", ids).order("return_date", { ascending: true });
      const grouped: Record<string, Return[]> = {};
      (rets as any[] || []).forEach((r: any) => {
        if (!grouped[r.consignment_id]) grouped[r.consignment_id] = [];
        grouped[r.consignment_id].push(r);
      });
      setReturns(grouped);
    }
  };

  // Fetch settlements
  const fetchSettlements = async () => {
    const { data } = await supabase.from("party_settlements").select("*").order("created_at", { ascending: false });
    setSettlements((data as any[]) || []);
    setLoadingS(false);
  };

  useEffect(() => { fetchConsignments(); fetchSettlements(); }, []);

  // Consignment CRUD
  const resetCForm = () => {
    setCPartyName(""); setCSentKg(""); setCSentDate(new Date().toISOString().split("T")[0]);
    setCFactoryFrom(""); setCFactoryAt(""); setCNotes(""); setEditCId(null); setShowCForm(false);
  };

  const handleSaveConsignment = async () => {
    const sk = parseFloat(cSentKg);
    if (!cPartyName || !sk) return;
    const payload: any = {
      party_name: cPartyName, sent_kg: sk, sent_date: cSentDate,
      factory_sent_from: cFactoryFrom, factory_processed_at: cFactoryAt, notes: cNotes || null,
    };
    if (editCId) {
      const { error } = await supabase.from("party_consignments").update(payload).eq("id", editCId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("party_consignments").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetCForm(); fetchConsignments();
  };

  const handleDeleteConsignment = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই কনসাইনমেন্ট মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("party_consignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchConsignments();
  };

  const handleEditConsignment = (c: Consignment) => {
    setEditCId(c.id); setCPartyName(c.party_name); setCSentKg(String(c.sent_kg));
    setCSentDate(c.sent_date); setCFactoryFrom(c.factory_sent_from); setCFactoryAt(c.factory_processed_at);
    setCNotes(c.notes || ""); setShowCForm(true);
  };

  // Return CRUD
  const handleAddReturn = async (consignmentId: string) => {
    const rk = parseFloat(rReturnKg);
    if (!rk) return;

    const c = consignments.find(x => x.id === consignmentId);
    if (!c) return;
    const totalReturned = (returns[consignmentId] || []).reduce((s, r) => s + Number(r.return_kg), 0) + rk;

    const { error } = await supabase.from("party_returns").insert({
      consignment_id: consignmentId, return_kg: rk, return_date: rReturnDate,
      notes: rNotes || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }

    // Update consignment totals
    const newStatus = totalReturned >= c.sent_kg ? "completed" : "partial_received";
    await supabase.from("party_consignments").update({
      total_returned_kg: totalReturned, status: newStatus
    }).eq("id", consignmentId);

    toast.success("ফেরত যোগ হয়েছে");
    setShowReturnForm(null); setRReturnKg(""); setRReturnDate(new Date().toISOString().split("T")[0]); setRNotes("");
    fetchConsignments();
  };

  const handleDeleteReturn = async (returnId: string, consignmentId: string) => {
    if (!confirm("এই ফেরত ব্যাচ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("party_returns").delete().eq("id", returnId);
    if (error) { toast.error(error.message); return; }

    // Recalculate
    const remaining = (returns[consignmentId] || []).filter(r => r.id !== returnId);
    const totalReturned = remaining.reduce((s, r) => s + Number(r.return_kg), 0);
    const c = consignments.find(x => x.id === consignmentId);
    const newStatus = totalReturned <= 0 ? "sent" : totalReturned >= (c?.sent_kg || 0) ? "completed" : "partial_received";
    await supabase.from("party_consignments").update({ total_returned_kg: totalReturned, status: newStatus }).eq("id", consignmentId);

    toast.success("ডিলিট হয়েছে"); fetchConsignments();
  };

  // Settlement CRUD
  const resetSForm = () => {
    setSPartyName(""); setSBuyerRate(""); setSPartyRate(""); setSTotalSales(""); setSCommission("");
    setSProcessingCost(""); setSPaid(""); setSGradeDetails([{ grade: "6\"", kg: 0, rate: 0 }]);
    setSRemandKg(""); setSChhatKg(""); setSComments(""); setSConsignmentId(""); setEditSId(null); setShowSForm(false);
  };

  const handleSaveSettlement = async () => {
    const br = parseFloat(sBuyerRate) || 0; const pr = parseFloat(sPartyRate) || 0;
    const gradeTotal = sGradeDetails.reduce((s, g) => s + g.kg * g.rate, 0);
    const ts = gradeTotal || parseFloat(sTotalSales) || 0;
    if (!sPartyName || ts <= 0) return;

    const margin = br - pr; const comm = parseFloat(sCommission) || 0;
    const pc = parseFloat(sProcessingCost) || 0; const payable = ts - comm - pc;
    const paid = parseFloat(sPaid) || 0; const due = payable - paid;

    const payload: any = {
      party_name: sPartyName, buyer_rate: br, party_rate: pr, margin, commission: comm,
      total_sales: ts, processing_cost: pc, payable, paid, due, status: due <= 0 ? "settled" : "pending",
      grade_details: sGradeDetails.filter(g => g.kg > 0),
      remand_kg: parseFloat(sRemandKg) || 0, chhat_kg: parseFloat(sChhatKg) || 0,
      comments: sComments, consignment_id: sConsignmentId || null,
    };

    if (editSId) {
      const { error } = await supabase.from("party_settlements").update(payload).eq("id", editSId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("party_settlements").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetSForm(); fetchSettlements();
  };

  const handleEditSettlement = (s: Settlement) => {
    setEditSId(s.id); setSPartyName(s.party_name); setSBuyerRate(String(s.buyer_rate));
    setSPartyRate(String(s.party_rate)); setSTotalSales(String(s.total_sales));
    setSCommission(String(s.commission)); setSProcessingCost(String(s.processing_cost || 0));
    setSPaid(String(s.paid || 0));
    const gd = Array.isArray(s.grade_details) ? s.grade_details as GradeDetail[] : [];
    setSGradeDetails(gd.length > 0 ? gd : [{ grade: "6\"", kg: 0, rate: 0 }]);
    setSRemandKg(String(s.remand_kg || 0)); setSChhatKg(String(s.chhat_kg || 0));
    setSComments(s.comments || ""); setSConsignmentId(s.consignment_id || "");
    setShowSForm(true);
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই সেটেলমেন্ট মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("party_settlements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchSettlements();
  };

  // Print settlement invoice (party view - no buyer rate)
  const handlePrintSettlement = (s: Settlement) => {
    setPrintSettlement(s);
    setTimeout(() => {
      const el = printRef.current;
      if (!el) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`<html><head><title>পার্টি সেটেলমেন্ট — ${s.party_name}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #222; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; } .header p { margin: 2px 0; font-size: 12px; color: #666; }
          .header img { max-height: 50px; margin-bottom: 6px; }
          .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
          th, td { border: 1px solid #999; padding: 6px 8px; } th { background: #f0f0f0; font-weight: 600; }
          .summary { border: 1px solid #999; padding: 12px; font-size: 13px; margin-bottom: 20px; }
          .summary div { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-block { text-align: center; }
          .sig-block .line { border-top: 1px solid #333; width: 160px; margin: 0 auto 4px; }
          .comments { border: 1px dashed #999; padding: 10px; font-size: 12px; margin-bottom: 15px; }
          @media print { body { padding: 0; } }
        </style></head><body>`);

      const logoUrl = settings.logo_url || "";
      const signatureUrl = settings.signature_url || "";
      const grades = Array.isArray(s.grade_details) ? s.grade_details as GradeDetail[] : [];
      const totalKg = grades.reduce((sum, g) => sum + g.kg, 0);
      const totalAmount = grades.reduce((sum, g) => sum + g.kg * g.rate, 0);
      const pc = Number(s.processing_cost || 0);
      const netPayable = totalAmount - pc;

      printWindow.document.write(`
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
          <h1>${settings.company_name}</h1>
          <p>${settings.tagline || ""}</p>
          <p>${settings.company_address || ""}</p>
        </div>
        <h2 style="text-align:center;font-size:16px;margin-bottom:15px;border:1px solid #333;display:inline-block;padding:4px 20px;">পার্টি সেটেলমেন্ট / Party Settlement</h2>
        <div class="meta">
          <div>
            <p><strong>তারিখ / Date:</strong> ${new Date(s.created_at).toLocaleDateString("bn-BD")}</p>
            <p><strong>পার্টির নাম / Party:</strong> ${s.party_name}</p>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>ক্রম / SL</th><th>গ্রেড / Grade</th><th style="text-align:right">ওজন / KG</th>
            <th style="text-align:right">দর / Rate (৳)</th><th style="text-align:right">মোট / Amount (৳)</th>
          </tr></thead>
          <tbody>${grades.map((g, i) => `<tr>
            <td>${i + 1}</td><td>${g.grade}</td><td style="text-align:right">${g.kg}</td>
            <td style="text-align:right">৳${g.rate.toLocaleString()}</td>
            <td style="text-align:right">৳${(g.kg * g.rate).toLocaleString()}</td>
          </tr>`).join("")}</tbody>
          <tfoot><tr style="font-weight:bold;background:#f5f5f5;">
            <td colspan="2">মোট / Total</td><td style="text-align:right">${totalKg} KG</td>
            <td></td><td style="text-align:right">৳${totalAmount.toLocaleString()}</td>
          </tr></tfoot>
        </table>
        <div class="summary">
          <div><span>মোট টাকা / Total Amount:</span><span style="font-weight:bold">৳${totalAmount.toLocaleString()}</span></div>
          <div><span>প্রসেসিং খরচ বাদ / Processing Cost:</span><span>- ৳${pc.toLocaleString()}</span></div>
          <div style="border-top:1px solid #333;padding-top:4px;margin-top:4px;">
            <span style="font-weight:bold">আমরা পাবো / We Will Receive:</span>
            <span style="font-weight:bold;font-size:15px;">৳${Number(s.payable || netPayable).toLocaleString()}</span>
          </div>
          <div><span>অগ্রিম দেওয়া / Advance Paid:</span><span>৳${Number(s.paid || 0).toLocaleString()}</span></div>
          <div style="border-top:1px solid #999;padding-top:4px;margin-top:4px;">
            <span style="font-weight:bold">বাকি আছে / Remaining Due:</span>
            <span style="font-weight:bold;font-size:15px;">৳${Number(s.due || 0).toLocaleString()}</span>
          </div>
        </div>
        ${Number(s.remand_kg || 0) > 0 || Number(s.chhat_kg || 0) > 0 ? `
        <div style="font-size:12px;margin-bottom:15px;">
          ${Number(s.remand_kg || 0) > 0 ? `<p><strong>রিমান্ড / Remand:</strong> ${s.remand_kg} KG</p>` : ""}
          ${Number(s.chhat_kg || 0) > 0 ? `<p><strong>ছাট / Chhat:</strong> ${s.chhat_kg} KG</p>` : ""}
        </div>` : ""}
        ${s.comments ? `<div class="comments"><strong>মন্তব্য / Comments:</strong> ${s.comments}</div>` : ""}
        <div class="signatures">
          <div class="sig-block">
            ${signatureUrl ? `<img src="${signatureUrl}" style="height:45px;max-width:160px;object-fit:contain;margin-bottom:4px;" />` : ""}
            <div class="line"></div>
            <p style="font-size:11px;">মালিকের স্বাক্ষর</p>
            <p style="font-size:9px;color:#888;">Owner's Signature</p>
          </div>
          <div class="sig-block">
            <div class="line" style="margin-top:49px;"></div>
            <p style="font-size:11px;">পার্টির স্বাক্ষর</p>
            <p style="font-size:9px;color:#888;">Party's Signature</p>
          </div>
        </div>
        <p style="font-size:10px;color:#999;margin-top:20px;text-align:center;">
          ${settings.company_name} — Computer Generated Settlement
        </p>
      </body></html>`);
      printWindow.document.close();
      printWindow.print();
      setPrintSettlement(null);
    }, 100);
  };

  // Grade detail helpers
  const addGradeRow = () => setSGradeDetails([...sGradeDetails, { grade: "8\"", kg: 0, rate: 0 }]);
  const removeGradeRow = (i: number) => setSGradeDetails(sGradeDetails.filter((_, idx) => idx !== i));
  const updateGradeRow = (i: number, field: string, val: string) => {
    const updated = [...sGradeDetails];
    if (field === "grade") updated[i].grade = val;
    else if (field === "kg") updated[i].kg = parseFloat(val) || 0;
    else if (field === "rate") updated[i].rate = parseFloat(val) || 0;
    setSGradeDetails(updated);
  };

  const statusLabel = (s: string) => {
    if (s === "sent") return { text: lang === "bn" ? "পাঠানো" : "Sent", cls: "bg-warning/15 text-warning" };
    if (s === "partial_received") return { text: lang === "bn" ? "আংশিক ফেরত" : "Partial", cls: "bg-info/15 text-info" };
    return { text: lang === "bn" ? "সম্পন্ন" : "Completed", cls: "bg-success/15 text-success" };
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button onClick={() => setTab("consignment")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === "consignment" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <Package className="w-4 h-4" />
          {lang === "bn" ? "কনসাইনমেন্ট ট্র্যাকিং" : "Consignment Tracking"}
        </button>
        <button onClick={() => setTab("settlement")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${tab === "settlement" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <FileText className="w-4 h-4" />
          {lang === "bn" ? "পার্টি সেটেলমেন্ট" : "Party Settlement"}
        </button>
      </div>

      {/* ===================== CONSIGNMENT TAB ===================== */}
      {tab === "consignment" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{lang === "bn" ? "পার্টি গুটি কনসাইনমেন্ট" : "Party Guti Consignment"}</h2>
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "মাল পাঠানো ও ফেরত ট্র্যাক করুন" : "Track material sent & returned"}</p>
            </div>
            <button onClick={() => { resetCForm(); setShowCForm(!showCForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />{lang === "bn" ? "নতুন কনসাইনমেন্ট" : "New Consignment"}
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-warning/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট পাঠানো" : "Total Sent"}</p>
              <p className="text-xl font-bold text-warning">{consignments.reduce((s, c) => s + Number(c.sent_kg), 0)} KG</p>
            </div>
            <div className="rounded-xl border border-info/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট ফেরত" : "Total Returned"}</p>
              <p className="text-xl font-bold text-info">{consignments.reduce((s, c) => s + Number(c.total_returned_kg), 0)} KG</p>
            </div>
            <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "বাকি আছে" : "Pending"}</p>
              <p className="text-xl font-bold text-destructive">{consignments.reduce((s, c) => s + (Number(c.sent_kg) - Number(c.total_returned_kg)), 0)} KG</p>
            </div>
          </div>

          {/* Consignment Form */}
          {showCForm && (
            <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
              <h3 className="text-sm font-semibold text-foreground mb-4">{editCId ? t("edit") : (lang === "bn" ? "নতুন কনসাইনমেন্ট" : "New Consignment")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("partyName")}</label><input value={cPartyName} onChange={e => setCPartyName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "পাঠানো ওজন (KG)" : "Sent Weight (KG)"}</label><input type="number" value={cSentKg} onChange={e => setCSentKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label><input type="date" value={cSentDate} onChange={e => setCSentDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "কোথা থেকে পাঠানো" : "Sent From"}</label><input value={cFactoryFrom} onChange={e => setCFactoryFrom(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "কোন কারখানায় কাজ" : "Processed At"}</label><input value={cFactoryAt} onChange={e => setCFactoryAt(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "নোট" : "Notes"}</label><input value={cNotes} onChange={e => setCNotes(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSaveConsignment} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
                <button onClick={resetCForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
              </div>
            </div>
          )}

          {/* Consignment List */}
          <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
            {loadingC ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : consignments.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
              <div className="space-y-3">
                {consignments.map(c => {
                  const sl = statusLabel(c.status);
                  const pending = Number(c.sent_kg) - Number(c.total_returned_kg);
                  const isExpanded = expandedC === c.id;
                  const cReturns = returns[c.id] || [];
                  return (
                    <div key={c.id} className="border border-border/50 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 hover:bg-secondary/30 cursor-pointer" onClick={() => setExpandedC(isExpanded ? null : c.id)}>
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.party_name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.sent_date} • {c.factory_sent_from} → {c.factory_processed_at}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{c.sent_kg} KG</p>
                            <p className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরত" : "Back"}: {c.total_returned_kg} KG | {lang === "bn" ? "বাকি" : "Pending"}: {pending} KG</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sl.cls}`}>{sl.text}</span>
                          <div className="flex items-center gap-1">
                            {can_edit && <button onClick={e => { e.stopPropagation(); handleEditConsignment(c); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                            {can_delete && <button onClick={e => { e.stopPropagation(); handleDeleteConsignment(c.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border/50 p-3 bg-secondary/10">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-muted-foreground">{lang === "bn" ? "ফেরত ব্যাচ সমূহ" : "Return Batches"}</h4>
                            {c.status !== "completed" && (
                              <button onClick={() => setShowReturnForm(showReturnForm === c.id ? null : c.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <RotateCcw className="w-3 h-3" />{lang === "bn" ? "ফেরত যোগ" : "Add Return"}
                              </button>
                            )}
                          </div>

                          {cReturns.length > 0 ? (
                            <div className="space-y-1">
                              {cReturns.map((r, idx) => (
                                <div key={r.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-secondary/30 text-xs">
                                  <span>#{idx + 1} — {r.return_date} — <span className="font-semibold">{r.return_kg} KG</span> {r.notes && <span className="text-muted-foreground">({r.notes})</span>}</span>
                                  {can_delete && <button onClick={() => handleDeleteReturn(r.id, c.id)} className="p-0.5 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3 text-destructive/60" /></button>}
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-[11px] text-muted-foreground">{lang === "bn" ? "কোন ফেরত ব্যাচ নেই" : "No return batches yet"}</p>}

                          {showReturnForm === c.id && (
                            <div className="mt-3 p-3 rounded-lg border border-primary/20 bg-background space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div><label className="text-[11px] text-muted-foreground mb-1 block">{lang === "bn" ? "ফেরত ওজন (KG)" : "Return KG"}</label><input type="number" value={rReturnKg} onChange={e => setRReturnKg(e.target.value)} className="w-full h-8 rounded-lg border border-border bg-secondary/50 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                                <div><label className="text-[11px] text-muted-foreground mb-1 block">{t("date")}</label><input type="date" value={rReturnDate} onChange={e => setRReturnDate(e.target.value)} className="w-full h-8 rounded-lg border border-border bg-secondary/50 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                                <div><label className="text-[11px] text-muted-foreground mb-1 block">{lang === "bn" ? "নোট" : "Notes"}</label><input value={rNotes} onChange={e => setRNotes(e.target.value)} className="w-full h-8 rounded-lg border border-border bg-secondary/50 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleAddReturn(c.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">{t("save")}</button>
                                <button onClick={() => setShowReturnForm(null)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs">{t("cancel")}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== SETTLEMENT TAB ===================== */}
      {tab === "settlement" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("partyModule")}</h2>
              <p className="text-xs text-muted-foreground">{t("hiddenBuyerRate")}</p>
            </div>
            <button onClick={() => { resetSForm(); setShowSForm(!showSForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />{t("addSettlement")}
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{t("totalSales")}</p>
              <p className="text-xl font-bold text-primary">৳{settlements.reduce((s, d) => s + Number(d.total_sales), 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "আমরা পাবো" : "We Receive"}</p>
              <p className="text-xl font-bold text-success">৳{settlements.reduce((s, d) => s + Number(d.payable || 0), 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-info/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "অগ্রিম দেওয়া" : "Advance Paid"}</p>
              <p className="text-xl font-bold text-info">৳{settlements.reduce((s, d) => s + Number(d.paid || 0), 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
              <p className="text-xs text-muted-foreground">{lang === "bn" ? "বাকি আছে" : "Remaining Due"}</p>
              <p className="text-xl font-bold text-destructive">৳{settlements.reduce((s, d) => s + Number(d.due || 0), 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Settlement Form */}
          {showSForm && (
            <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
              <h3 className="text-sm font-semibold text-foreground mb-4">{editSId ? t("edit") : t("addSettlement")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("partyName")}</label><input value={sPartyName} onChange={e => setSPartyName(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerRate")} ({lang === "bn" ? "গোপন" : "Hidden"})</label><input type="number" value={sBuyerRate} onChange={e => setSBuyerRate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("commission")}</label><input type="number" value={sCommission} onChange={e => setSCommission(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("processingCost")}</label><input type="number" value={sProcessingCost} onChange={e => setSProcessingCost(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("paid")}</label><input type="number" value={sPaid} onChange={e => setSPaid(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("remand")} (KG)</label><input type="number" value={sRemandKg} onChange={e => setSRemandKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t("chhat")} (KG)</label><input type="number" value={sChhatKg} onChange={e => setSChhatKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                {consignments.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "কনসাইনমেন্ট লিংক" : "Link Consignment"}</label>
                    <select value={sConsignmentId} onChange={e => setSConsignmentId(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">{lang === "bn" ? "নির্বাচন করুন" : "Select"}</option>
                      {consignments.map(c => <option key={c.id} value={c.id}>{c.party_name} — {c.sent_kg}KG ({c.sent_date})</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Grade-wise details */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">{t("gradeDetails")} ({lang === "bn" ? "পার্টি রেটে" : "Party Rate"})</label>
                  <button onClick={addGradeRow} className="text-[11px] text-primary hover:underline">+ {lang === "bn" ? "গ্রেড যোগ" : "Add Grade"}</button>
                </div>
                <div className="space-y-2">
                  {sGradeDetails.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value={g.grade} onChange={e => updateGradeRow(i, "grade", e.target.value)} className="h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        {GRADES.map(gr => <option key={gr} value={gr}>{gr}</option>)}
                      </select>
                      <input type="number" placeholder="KG" value={g.kg || ""} onChange={e => updateGradeRow(i, "kg", e.target.value)} className="w-24 h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input type="number" placeholder={lang === "bn" ? "দর (৳)" : "Rate"} value={g.rate || ""} onChange={e => updateGradeRow(i, "rate", e.target.value)} className="w-28 h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <span className="text-xs text-muted-foreground w-24">= ৳{(g.kg * g.rate).toLocaleString()}</span>
                      {sGradeDetails.length > 1 && <button onClick={() => removeGradeRow(i)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                  <p className="text-xs font-medium text-foreground">
                    {lang === "bn" ? "মোট" : "Total"}: {sGradeDetails.reduce((s, g) => s + g.kg, 0)} KG = ৳{sGradeDetails.reduce((s, g) => s + g.kg * g.rate, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Comments */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "মন্তব্য" : "Comments"}</label>
                <textarea value={sComments} onChange={e => setSComments(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveSettlement} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
                <button onClick={resetSForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
              </div>
            </div>
          )}

          {/* Settlement Table */}
          <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("partySettlement")}</h3>
            <PrintToolbar moduleName={t("partyModule")} data={settlements} selectedIds={selectedSIds} onSelectionChange={setSelectedSIds} dateField="created_at" cardContainerId="party-settlement-cards"
              renderPrintTable={(items) => {
                const ts = items.reduce((s: number, p: any) => s + Number(p.total_sales), 0);
                const td = items.reduce((s: number, p: any) => s + Number(p.due || 0), 0);
                return `<table><thead><tr><th>পার্টি</th><th style="text-align:right">মোট বিক্রয়</th><th style="text-align:right">আমরা পাবো</th><th style="text-align:right">অগ্রিম</th><th style="text-align:right">বাকি</th></tr></thead><tbody>${items.map((p: any) => `<tr><td>${p.party_name}</td><td style="text-align:right">৳${Number(p.total_sales).toLocaleString()}</td><td style="text-align:right">৳${Number(p.payable || 0).toLocaleString()}</td><td style="text-align:right">৳${Number(p.paid || 0).toLocaleString()}</td><td style="text-align:right">৳${Number(p.due || 0).toLocaleString()}</td></tr>`).join("")}</tbody><tfoot><tr class="total-row"><td>মোট</td><td style="text-align:right">৳${ts.toLocaleString()}</td><td colspan="2"></td><td style="text-align:right">৳${td.toLocaleString()}</td></tr></tfoot></table>`;
              }}
            />
            {loadingS ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : settlements.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
              <div className="space-y-4" id="party-settlement-cards">
                {settlements.map(s => {
                  const grades = Array.isArray(s.grade_details) ? s.grade_details as GradeDetail[] : [];
                  const totalKg = grades.reduce((sum, g) => sum + g.kg, 0);
                  return (
                    <div key={s.id} data-card-id={s.id} onClick={() => { const ids = new Set(selectedSIds); ids.has(s.id) ? ids.delete(s.id) : ids.add(s.id); setSelectedSIds(ids); }}
                      className={`rounded-xl border p-6 bg-gradient-card shadow-card cursor-pointer transition-all ${selectedSIds.has(s.id) ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedSIds.has(s.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                            {selectedSIds.has(s.id) && <span className="text-xs">✓</span>}
                          </div>
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{s.party_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString("bn-BD")} · <span className={`px-1.5 py-0.5 rounded-full ${s.status === "settled" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{s.status === "settled" ? "সম্পন্ন" : "বাকি আছে"}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Number(s.remand_kg || 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">রিমান্ড: {s.remand_kg} KG</span>}
                              {Number(s.chhat_kg || 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">ছাট: {s.chhat_kg} KG</span>}
                              {s.comments && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{s.comments}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={ev => { ev.stopPropagation(); handlePrintSettlement(s); }} className="p-1 rounded hover:bg-secondary" title="প্রিন্ট"><FileText className="w-4 h-4 text-primary" /></button>
                          {can_edit && <button onClick={ev => { ev.stopPropagation(); handleEditSettlement(s); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>}
                          {can_delete && <button onClick={ev => { ev.stopPropagation(); handleDeleteSettlement(s.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive/70" /></button>}
                        </div>
                      </div>

                      {/* Grade breakdown table */}
                      {grades.length > 0 && (
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
                            {grades.map((g, i) => (
                              <tr key={i} className="border-b border-border/30">
                                <td className="py-2 pr-3 text-xs font-medium text-foreground">{g.grade}</td>
                                <td className="py-2 pr-3 text-xs text-right text-foreground">{g.kg} KG</td>
                                <td className="py-2 pr-3 text-xs text-right text-foreground">৳{Number(g.rate).toLocaleString()}</td>
                                <td className="py-2 text-xs text-right font-medium text-foreground">৳{(g.kg * g.rate).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Financial summary */}
                      <div className="flex flex-wrap items-center justify-end gap-4 text-xs pt-2 border-t border-border">
                        <span className="text-foreground">মোট বিক্রয়: <strong>৳{Number(s.total_sales).toLocaleString()}</strong></span>
                        {Number(s.processing_cost || 0) > 0 && <span className="text-muted-foreground">প্রসেসিং: <strong>-৳{Number(s.processing_cost).toLocaleString()}</strong></span>}
                        <span className="text-success">আমরা পাবো: <strong>৳{Number(s.payable || 0).toLocaleString()}</strong></span>
                        <span className="text-info">অগ্রিম: <strong>৳{Number(s.paid || 0).toLocaleString()}</strong></span>
                        {Number(s.due || 0) > 0 && <span className="text-destructive">বাকি: <strong>৳{Number(s.due).toLocaleString()}</strong></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden print ref */}
      <div ref={printRef} className="hidden" />
    </div>
  );
};

export default PartyModule;
