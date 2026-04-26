import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import PrintToolbar from "@/components/PrintToolbar";

type Transfer = {
  id: string; transfer_date: string; from_factory_id: string | null; to_factory_id: string | null;
  weight_kg: number; received_weight_kg: number | null; status: string;
  recipient_name: string | null; recipient_address: string | null; recipient_phone: string | null; courier_name: string | null;
};
type FactoryRow = { id: string; name: string; location: string };

const BookingSlipModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings: company } = useCompanySettings();
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<Transfer[]>([]);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [courierName, setCourierName] = useState("");

  const fetchData = async () => {
    const [{ data: rows }, { data: f }] = await Promise.all([
      supabase.from("transfers").select("*").not("recipient_name", "is", null).order("transfer_date", { ascending: false }),
      supabase.from("factories").select("id, name, location"),
    ]);
    setData(rows || []); setFactories(f || []); setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setFromId(""); setToId(""); setWeightKg("");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setRecipientName(""); setRecipientAddress(""); setRecipientPhone(""); setCourierName("");
    setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    const w = parseFloat(weightKg);
    if (!w || !recipientName) return;

    const payload: any = {
      from_factory_id: fromId || null, to_factory_id: toId || null, weight_kg: w,
      transfer_date: transferDate, status: "in_transit",
      recipient_name: recipientName, recipient_address: recipientAddress || null,
      recipient_phone: recipientPhone || null, courier_name: courierName || null,
    };

    if (editId) {
      const { error } = await supabase.from("transfers").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("transfers").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchData();
  };

  const handleEdit = (tr: Transfer) => {
    setEditId(tr.id); setFromId(tr.from_factory_id || ""); setToId(tr.to_factory_id || "");
    setWeightKg(String(tr.weight_kg)); setTransferDate(tr.transfer_date);
    setRecipientName(tr.recipient_name || ""); setRecipientAddress(tr.recipient_address || "");
    setRecipientPhone(tr.recipient_phone || ""); setCourierName(tr.courier_name || "");
    setShowForm(true);
  };

  const getName = (id: string | null) => factories.find(f => f.id === id)?.name || "—";
  const getLocation = (id: string | null) => factories.find(f => f.id === id)?.location || "";

  const handlePrint = (tr: Transfer) => {
    const fromName = getName(tr.from_factory_id);
    const fromLocation = getLocation(tr.from_factory_id);
    const toName = getName(tr.to_factory_id);

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked"); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Booking Slip</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #000; max-width: 600px; margin: 0 auto; position: relative; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.06; pointer-events: none; z-index: 0; }
        .watermark img { max-width: 350px; max-height: 350px; }
        .content { position: relative; z-index: 1; }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; letter-spacing: 2px; }
        .header p { font-size: 11px; color: #666; margin-top: 4px; }
        .title { text-align: center; margin-bottom: 20px; }
        .title h2 { font-size: 16px; border: 2px solid #000; display: inline-block; padding: 6px 30px; letter-spacing: 1px; }
        .section { border: 1px solid #ccc; border-radius: 6px; padding: 14px; margin-bottom: 14px; }
        .section-title { font-size: 12px; font-weight: 700; color: #555; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
        .row .label { font-weight: 600; color: #333; }
        .row .value { color: #000; }
        .highlight { background: #f5f5f5; border: 2px solid #000; border-radius: 6px; padding: 16px; margin-bottom: 14px; text-align: center; }
        .highlight .weight { font-size: 28px; font-weight: 800; }
        .highlight .sub { font-size: 11px; color: #666; margin-top: 4px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; }
        .sig-block { text-align: center; }
        .sig-line { border-top: 1px solid #000; width: 140px; margin-bottom: 4px; }
        .footer { text-align: center; font-size: 9px; color: #aaa; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print { body { padding: 20px; } .watermark { position: fixed; } }
      </style>
    </head><body>
      ${company.logo_url ? `<div class="watermark"><img src="${company.logo_url}" alt="Watermark" /></div>` : ""}
      <div class="content">
      <div class="header">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-height:50px;margin:0 auto 8px;display:block;" />` : ""}
        <h1>${company.company_name.toUpperCase()}</h1>
        <p>${company.tagline}</p>
        <p>${company.company_address}</p>
        ${company.company_phone ? `<p>Phone: ${company.company_phone}</p>` : ""}
      </div>
      <div class="title"><h2>বুকিং স্লিপ / BOOKING SLIP</h2></div>
      <div class="row" style="margin-bottom:14px">
        <span class="label">তারিখ / Date:</span><span class="value">${tr.transfer_date}</span>
      </div>
      <div class="section">
        <div class="section-title">প্রেরক / Sender</div>
        <div class="row"><span class="label">কারখানা:</span><span class="value">${fromName}</span></div>
        ${fromLocation ? `<div class="row"><span class="label">ঠিকানা:</span><span class="value">${fromLocation}</span></div>` : ""}
      </div>
      <div class="section">
        <div class="section-title">প্রাপক / Receiver</div>
        ${toName !== "—" ? `<div class="row"><span class="label">কারখানা:</span><span class="value">${toName}</span></div>` : ""}
        ${tr.recipient_name ? `<div class="row"><span class="label">নাম:</span><span class="value">${tr.recipient_name}</span></div>` : ""}
        ${tr.recipient_address ? `<div class="row"><span class="label">ঠিকানা:</span><span class="value">${tr.recipient_address}</span></div>` : ""}
        ${tr.recipient_phone ? `<div class="row"><span class="label">ফোন:</span><span class="value">${tr.recipient_phone}</span></div>` : ""}
      </div>
      <div class="highlight">
        <div class="weight">${tr.weight_kg} KG</div>
        <div class="sub">মোট ওজন / Total Weight</div>
      </div>
      ${tr.courier_name ? `<div class="section">
        <div class="section-title">কুরিয়ার / Courier</div>
        <div class="row"><span class="label">সার্ভিস:</span><span class="value">${tr.courier_name}</span></div>
      </div>` : ""}
      <div class="signatures">
        <div class="sig-block"><div class="sig-line"></div><p>প্রেরকের স্বাক্ষর</p></div>
        <div class="sig-block"><div class="sig-line"></div><p>প্রাপকের স্বাক্ষর</p></div>
      </div>
      <div class="footer">${company.company_name} — Computer Generated Booking Slip</div>
      </div>
    </body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("bookingSlipModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("bookingSlipDesc")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{t("newBookingSlip")}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("newBookingSlip")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("from")}</label>
              <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("to")}</label>
              <select value={toId} onChange={e => setToId(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("transferWeight")}</label>
              <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-3">{t("receiverInfo")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className="text-xs text-muted-foreground mb-1 block">{t("recipientName")} *</label>
                <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="যার কাছে পাঠাচ্ছেন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">{t("recipientAddress")}</label>
                <input value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="প্রাপকের ঠিকানা" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">{t("recipientPhone")}</label>
                <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">{t("courierName")}</label>
                <input value={courierName} onChange={e => setCourierName(e.target.value)} placeholder="সুন্দরবন / SA পরিবহন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("bookingSlipHistory")}</h3>
        <PrintToolbar
          moduleName={t("bookingSlipModule")}
          data={data}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="transfer_date"
          renderPrintTable={(items) => {
            const tw = items.reduce((s: number, tr: any) => s + Number(tr.weight_kg), 0);
            return `<table><thead><tr><th>তারিখ</th><th>প্রেরক</th><th>প্রাপক</th><th>প্রাপকের নাম</th><th>ফোন</th><th>কুরিয়ার</th><th style="text-align:right">ওজন (KG)</th></tr></thead><tbody>${items.map((tr: any) => `<tr><td>${tr.transfer_date}</td><td>${getName(tr.from_factory_id)}</td><td>${getName(tr.to_factory_id)}</td><td>${tr.recipient_name || "—"}</td><td>${tr.recipient_phone || "—"}</td><td>${tr.courier_name || "—"}</td><td style="text-align:right">${tr.weight_kg} KG</td></tr>`).join("")}</tbody><tfoot><tr class="total-row"><td colspan="6">মোট</td><td style="text-align:right">${tw} KG</td></tr></tfoot></table>`;
          }}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : data.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[t("date"), t("from"), t("to"), t("recipientName"), t("recipientPhone"), t("courierName"), t("transferWeight"), t("action")].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(tr => (
                  <tr key={tr.id} onClick={() => { const s = new Set(selectedIds); s.has(tr.id) ? s.delete(tr.id) : s.add(tr.id); setSelectedIds(s); }} className={`border-b border-border/50 cursor-pointer transition-colors ${selectedIds.has(tr.id) ? "bg-primary/10" : "hover:bg-secondary/30"}`}>
                    <td className="py-3 pr-3 text-xs text-foreground">{tr.transfer_date}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{getName(tr.from_factory_id)}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{getName(tr.to_factory_id)}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{tr.recipient_name || "—"}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{tr.recipient_phone || "—"}</td>
                    <td className="py-3 pr-3 text-xs text-foreground">{tr.courier_name || "—"}</td>
                    <td className="py-3 pr-3 text-xs font-medium text-foreground">{tr.weight_kg} KG</td>
                    <td className="py-3 pr-3 flex items-center gap-1">
                      <button onClick={(ev) => { ev.stopPropagation(); handlePrint(tr); }} className="p-1 rounded hover:bg-secondary" title={t("printBookingSlip")}><Printer className="w-3.5 h-3.5 text-primary" /></button>
                      <button onClick={(ev) => { ev.stopPropagation(); handleEdit(tr); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSlipModule;
