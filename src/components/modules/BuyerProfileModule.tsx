import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

type Buyer = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  wechat: string | null;
  imo: string | null;
  country: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  total_due?: number;
};

const countryOptions = [
  { value: "BD", label: "🇧🇩 বাংলাদেশ" },
  { value: "IN", label: "🇮🇳 ভারত" },
  { value: "CN", label: "🇨🇳 চীন" },
  { value: "OTHER", label: "🌍 অন্যান্য" },
];

const BuyerProfileModule = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("sales");
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [wechat, setWechat] = useState("");
  const [imo, setImo] = useState("");
  const [country, setCountry] = useState("BD");
  const [notes, setNotes] = useState("");

  const fetchBuyers = async () => {
    const { data: buyerRows } = await supabase.from("buyers").select("*").order("name");
    // Get dues per buyer
    const { data: salesDues } = await supabase.from("sales").select("buyer_name, due_amount").gt("due_amount", 0);
    const dueMap: Record<string, number> = {};
    (salesDues || []).forEach(s => {
      dueMap[s.buyer_name] = (dueMap[s.buyer_name] || 0) + Number(s.due_amount || 0);
    });

    setBuyers((buyerRows || []).map(b => ({ ...b, total_due: dueMap[b.name] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchBuyers(); }, []);

  const resetForm = () => {
    setName(""); setAddress(""); setPhone(""); setWhatsapp(""); setWechat(""); setImo(""); setCountry("BD"); setNotes(""); setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), address: address || null, phone: phone || null, whatsapp: whatsapp || null, wechat: wechat || null, imo: imo || null, country, notes: notes || null };

    if (editId) {
      const { error } = await supabase.from("buyers").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("buyers").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t("saved")); resetForm(); fetchBuyers();
  };

  const handleEdit = (b: Buyer) => {
    setEditId(b.id); setName(b.name); setAddress(b.address || ""); setPhone(b.phone || "");
    setWhatsapp(b.whatsapp || ""); setWechat(b.wechat || ""); setImo(b.imo || "");
    setCountry(b.country); setNotes(b.notes || ""); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "bn" ? "নিশ্চিত করুন — এই বায়ার মুছে ফেলা হবে?" : "Confirm delete this buyer?")) return;
    const { error } = await supabase.from("buyers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("deleted")); fetchBuyers();
  };

  const sendWhatsApp = (num: string, buyerName: string, due: number) => {
    const msg = encodeURIComponent(
      lang === "bn"
        ? `প্রিয় ${buyerName}, আপনার বকেয়া পরিমাণ ৳${due.toLocaleString()}। অনুগ্রহ করে যত দ্রুত সম্ভব পরিশোধ করুন। — Mahin Enterprise`
        : `Dear ${buyerName}, your outstanding due is ৳${due.toLocaleString()}. Please settle at your earliest convenience. — Mahin Enterprise`
    );
    window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  const sendWeChat = (wechatId: string) => {
    toast.info(lang === "bn" ? `WeChat ID: ${wechatId} — WeChat অ্যাপে গিয়ে মেসেজ পাঠান` : `WeChat ID: ${wechatId} — Send message via WeChat app`);
  };

  const filtered = buyers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.phone?.includes(searchQuery) ||
    b.whatsapp?.includes(searchQuery)
  );

  const totalDue = buyers.reduce((s, b) => s + (b.total_due || 0), 0);
  const dueCount = buyers.filter(b => (b.total_due || 0) > 0).length;

  const inputClass = "w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{lang === "bn" ? "বায়ার প্রোফাইল" : "Buyer Profiles"}</h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "সকল বায়ারের তথ্য ও যোগাযোগ" : "All buyer info & contacts"}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />{lang === "bn" ? "নতুন বায়ার" : "Add Buyer"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বায়ার" : "Total Buyers"}</p>
          <p className="text-2xl font-bold text-primary">{buyers.length}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বকেয়া" : "Total Due"}</p>
          <p className="text-2xl font-bold text-destructive">৳{totalDue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-warning/20 p-4 bg-gradient-card shadow-card">
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "বকেয়াদার বায়ার" : "Buyers with Due"}</p>
          <p className="text-2xl font-bold text-warning">{dueCount}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : (lang === "bn" ? "নতুন বায়ার যোগ করুন" : "Add New Buyer")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted-foreground mb-1 block">{t("buyerName")} *</label><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "দেশ" : "Country"}</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className={inputClass}>
                {countryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "ঠিকানা" : "Address"}</label><input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "ফোন নাম্বার" : "Phone"}</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880..." className={inputClass} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">WhatsApp</label><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+880..." className={inputClass} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">WeChat ID</label><input value={wechat} onChange={e => setWechat(e.target.value)} className={inputClass} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">IMO</label><input value={imo} onChange={e => setImo(e.target.value)} placeholder="+880..." className={inputClass} /></div>
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">{lang === "bn" ? "নোট" : "Notes"}</label><input value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder={lang === "bn" ? "বায়ার খুঁজুন (নাম/ফোন)..." : "Search buyers (name/phone)..."}
          className="w-full h-10 rounded-lg border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Buyer cards */}
      <div className="space-y-3">
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : filtered.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
          filtered.map(b => (
            <div key={b.id} className="rounded-xl border border-border p-4 bg-gradient-card shadow-card hover:border-primary/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{b.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {countryOptions.find(c => c.value === b.country)?.label || b.country}
                    </span>
                    {(b.total_due || 0) > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                        {lang === "bn" ? "বকেয়া" : "Due"}: ৳{(b.total_due || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {b.address && <p className="text-xs text-muted-foreground mb-1">📍 {b.address}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {b.phone && <span>📞 {b.phone}</span>}
                    {b.whatsapp && <span className="text-success">WhatsApp: {b.whatsapp}</span>}
                    {b.wechat && <span className="text-info">WeChat: {b.wechat}</span>}
                    {b.imo && <span className="text-primary">IMO: {b.imo}</span>}
                  </div>
                  {b.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">💬 {b.notes}</p>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Send reminder buttons */}
                  {b.whatsapp && (b.total_due || 0) > 0 && (
                    <button
                      onClick={() => sendWhatsApp(b.whatsapp!, b.name, b.total_due || 0)}
                      className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 transition-colors"
                      title="WhatsApp রিমাইন্ডার"
                    >
                      <MessageCircle className="w-4 h-4 text-success" />
                    </button>
                  )}
                  {b.wechat && (b.total_due || 0) > 0 && (
                    <button
                      onClick={() => sendWeChat(b.wechat!)}
                      className="p-1.5 rounded-lg bg-info/10 hover:bg-info/20 transition-colors"
                      title="WeChat রিমাইন্ডার"
                    >
                      <MessageCircle className="w-4 h-4 text-info" />
                    </button>
                  )}
                  {can_edit && (
                    <button onClick={() => handleEdit(b)} className="p-1.5 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  )}
                  {can_delete && (
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BuyerProfileModule;
