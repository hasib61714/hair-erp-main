import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import PrintToolbar from "@/components/PrintToolbar";

type CashEntry = {
  id: string;
  entry_date: string;
  entry_type: string;
  category: string;
  description: string | null;
  amount: number;
  person_name: string | null;
  payment_method: string;
};

const CashModule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { can_edit, can_delete } = usePermissions("cash");
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [entryType, setEntryType] = useState("cash_out");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [personName, setPersonName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const fetchData = async () => {
    const { data } = await supabase.from("cash_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const opening = 0;
  const totalIn = entries.filter(e => e.entry_type === "cash_in").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = entries.filter(e => e.entry_type === "cash_out").reduce((s, e) => s + Number(e.amount), 0);
  const closing = opening + totalIn - totalOut;

  const resetForm = () => {
    setEntryType("cash_out"); setCategory(""); setDescription(""); setAmount("");
    setEntryDate(new Date().toISOString().split("T")[0]); setEditId(null); setShowForm(false);
    setPersonName(""); setPaymentMethod("cash");
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!category || !amt) return;

    if (editId) {
      const { error } = await supabase.from("cash_entries").update({
        entry_type: entryType, category, description: description || null, amount: amt, entry_date: entryDate,
        person_name: personName || null, payment_method: paymentMethod,
      }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success(t("saved"));
    } else {
      const { error } = await supabase.from("cash_entries").insert({
        entry_type: entryType, category, description: description || null, amount: amt, entry_date: entryDate, created_by: user?.id,
        person_name: personName || null, payment_method: paymentMethod,
      });
      if (error) { toast.error(error.message); return; }
      toast.success(t("saved"));
    }
    resetForm(); fetchData();
  };

  const handleEdit = (e: CashEntry) => {
    setEditId(e.id); setEntryType(e.entry_type); setCategory(e.category);
    setDescription(e.description || ""); setAmount(String(e.amount)); setEntryDate(e.entry_date);
    setPersonName(e.person_name || ""); setPaymentMethod(e.payment_method || "cash");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নিশ্চিত করুন — এই এন্ট্রি মুছে ফেলা হবে?")) return;
    const { error } = await supabase.from("cash_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে"); fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("cashModule")}</h2>
          <p className="text-xs text-muted-foreground">{t("dailyCashbook")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          {t("addEntry")}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4 bg-gradient-card shadow-card">
          <Wallet className="w-4 h-4 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">{t("opening")}</p>
          <p className="text-xl font-bold text-foreground">৳{opening.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-success/20 p-4 bg-gradient-card shadow-card">
          <ArrowDownCircle className="w-4 h-4 text-success mb-2" />
          <p className="text-xs text-muted-foreground">{t("cashIn")}</p>
          <p className="text-xl font-bold text-success">৳{totalIn.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-destructive/20 p-4 bg-gradient-card shadow-card">
          <ArrowUpCircle className="w-4 h-4 text-destructive mb-2" />
          <p className="text-xs text-muted-foreground">{t("cashOut")}</p>
          <p className="text-xl font-bold text-destructive">৳{totalOut.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-primary/20 p-4 bg-gradient-card shadow-card">
          <Wallet className="w-4 h-4 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">{t("closing")}</p>
          <p className="text-xl font-bold text-primary">৳{closing.toLocaleString()}</p>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card animate-slide-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? t("edit") : t("addEntry")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("type")}</label>
              <select value={entryType} onChange={e => setEntryType(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="cash_in">{t("cashIn")}</option>
                <option value="cash_out">{t("cashOut")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("personName")}</label>
              <input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="যার মাধ্যমে লেনদেন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("paymentMethod")}</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="cash">{t("nagadCash")}</option>
                <option value="bank">{t("bankTransfer")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("category")}</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="যেকোনো ক্যাটাগরি লিখুন" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("description")}</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("amount")}</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("date")}</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-gradient-gold text-primary-foreground text-sm font-medium">{t("save")}</button>
            <button onClick={resetForm} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("dailyCashbook")}</h3>
        <PrintToolbar
          moduleName={t("cashModule")}
          data={entries}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          dateField="entry_date"
          cardContainerId="cash-cards"
          renderPrintTable={(items) => {
            const tIn = items.filter(e => e.entry_type === "cash_in").reduce((s: number, e: any) => s + Number(e.amount), 0);
            const tOut = items.filter(e => e.entry_type === "cash_out").reduce((s: number, e: any) => s + Number(e.amount), 0);
            return `<table><thead><tr><th>তারিখ</th><th>ধরন</th><th>ব্যক্তি</th><th>ক্যাটাগরি</th><th>বিবরণ</th><th>মাধ্যম</th><th style="text-align:right">টাকা</th></tr></thead><tbody>${items.map(e => `<tr><td>${e.entry_date}</td><td>${e.entry_type === "cash_in" ? "জমা" : "খরচ"}</td><td>${e.person_name || "—"}</td><td>${e.category}</td><td>${e.description || "—"}</td><td>${e.payment_method === "bank" ? "ব্যাংক" : "নগদ"}</td><td style="text-align:right">${e.entry_type === "cash_in" ? "+" : "-"}৳${Number(e.amount).toLocaleString()}</td></tr>`).join("")}</tbody><tfoot><tr class="total-row"><td colspan="6">জমা: ৳${tIn.toLocaleString()} | খরচ: ৳${tOut.toLocaleString()}</td><td style="text-align:right;font-weight:bold">ব্যালেন্স: ৳${(tIn - tOut).toLocaleString()}</td></tr></tfoot></table>`;
          }}
        />
        {loading ? <p className="text-xs text-muted-foreground">{t("loading")}</p> : entries.length === 0 ? <p className="text-xs text-muted-foreground">{t("noData")}</p> : (
          <div className="space-y-2" id="cash-cards">
            {entries.map(e => (
              <div key={e.id} data-card-id={e.id} onClick={() => { const s = new Set(selectedIds); s.has(e.id) ? s.delete(e.id) : s.add(e.id); setSelectedIds(s); }} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(e.id) ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/30 hover:bg-secondary/50"}`}>
                <div className="flex items-center gap-3">
                  {e.entry_type === "cash_in" ? <ArrowDownCircle className="w-4 h-4 text-success shrink-0" /> : <ArrowUpCircle className="w-4 h-4 text-destructive shrink-0" />}
                  <div>
                    <p className="text-xs font-medium text-foreground">{e.description || e.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.person_name ? `${e.person_name} • ` : ""}{e.payment_method === "bank" ? "🏦 ব্যাংক" : "💵 নগদ"} • {e.category} • {e.entry_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${e.entry_type === "cash_in" ? "text-success" : "text-destructive"}`}>
                    {e.entry_type === "cash_in" ? "+" : "-"}৳{Number(e.amount).toLocaleString()}
                  </span>
                  {can_edit && <button onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }} className="p-1 rounded hover:bg-secondary"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                  {can_delete && <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashModule;
