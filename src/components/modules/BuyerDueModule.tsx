import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, History, CheckCircle2 } from "lucide-react";

type BuyerDue = {
  buyer_name: string;
  total_due: number;
  total_sales: number;
  total_paid: number;
  sale_count: number;
  is_paid: boolean;
  buyer_id?: string;
};

const BuyerDueModule = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<BuyerDue[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: sales }, { data: bpayments }, { data: buyerRows }] = await Promise.all([
      supabase.from("sales").select("buyer_name, total_amount, due_amount"),
      supabase.from("buyer_payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("buyers").select("id, name, is_paid"),
    ]);

    const buyerIdMap: Record<string, { id: string; is_paid: boolean }> = {};
    (buyerRows || []).forEach((b: any) => { buyerIdMap[b.name] = { id: b.id, is_paid: b.is_paid ?? false }; });

    const buyerMap: Record<string, BuyerDue> = {};
    ((sales || []) as any[]).forEach(s => {
      if (!buyerMap[s.buyer_name]) {
        buyerMap[s.buyer_name] = { buyer_name: s.buyer_name, total_due: 0, total_sales: 0, total_paid: 0, sale_count: 0, is_paid: buyerIdMap[s.buyer_name]?.is_paid ?? false, buyer_id: buyerIdMap[s.buyer_name]?.id };
      }
      buyerMap[s.buyer_name].total_due += Number(s.due_amount || 0);
      buyerMap[s.buyer_name].total_sales += Number(s.total_amount || 0);
      buyerMap[s.buyer_name].sale_count += 1;
    });

    ((bpayments || []) as any[]).forEach(p => {
      if (buyerMap[p.buyer_name]) {
        buyerMap[p.buyer_name].total_paid += Number(p.amount);
        buyerMap[p.buyer_name].total_due -= Number(p.amount);
      }
    });

    setBuyers(Object.values(buyerMap).sort((a, b) => b.total_due - a.total_due));
    setPayments(bpayments || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handlePayment = async () => {
    if (!selectedBuyer || !payAmount || !user) return;
    const { error } = await (supabase.from("buyer_payments") as any).insert({
      buyer_name: selectedBuyer,
      amount: Number(payAmount),
      payment_method: payMethod,
      notes: payNote || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "পেমেন্ট রেকর্ড হয়েছে" : "Payment recorded");
    setShowPayForm(false);
    setPayAmount("");
    setPayNote("");
    fetchData();
  };

  const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");
  const totalDue = buyers.filter(b => b.total_due > 0 && !b.is_paid).reduce((s, b) => s + b.total_due, 0);
  const paidCount = buyers.filter(b => b.total_due <= 0 || b.is_paid).length;
  const visibleBuyers = showPaid ? buyers : buyers.filter(b => b.total_due > 0 && !b.is_paid);

  const toggleBuyerPaid = async (b: BuyerDue) => {
    if (!b.buyer_id) { toast.error("Buyer not found in buyers table"); return; }
    const newVal = !b.is_paid;
    const { error } = await (supabase.from("buyers") as any).update({ is_paid: newVal }).eq("id", b.buyer_id);
    if (error) { toast.error(error.message); return; }
    setBuyers(prev => prev.map(x => x.buyer_name === b.buyer_name ? { ...x, is_paid: newVal } : x));
    toast.success(newVal ? "PAID সিল দেওয়া হয়েছে" : "PAID সিল সরানো হয়েছে");
  };

  const buyerPayments = selectedBuyer ? payments.filter(p => p.buyer_name === selectedBuyer) : [];

  if (loading) return <div className="text-center py-10 text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{lang === "bn" ? "বায়ার বকেয়া ট্র্যাকিং" : "Buyer Due Tracking"}</h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "কোন বায়ারের কত টাকা বকেয়া আছে" : "Track outstanding dues per buyer"}</p>
        </div>
        <div className="flex items-center gap-3">
          {paidCount > 0 && (
            <button onClick={() => setShowPaid(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showPaid ? "border-success/50 bg-success/10 text-success" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {showPaid ? (lang === "bn" ? "পরিশোধিত লুকান" : "Hide Paid") : (lang === "bn" ? `পরিশোধিত দেখুন (${paidCount})` : `Show Paid (${paidCount})`)}
            </button>
          )}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2">
            <p className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বকেয়া" : "Total Outstanding"}</p>
            <p className="text-lg font-bold text-destructive">{fmt(totalDue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Buyer List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{lang === "bn" ? "বায়ারের নাম" : "Buyer Name"}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">{lang === "bn" ? "মোট বিক্রয়" : "Total Sales"}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">{lang === "bn" ? "বকেয়া" : "Due"}</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">{lang === "bn" ? "কার্যক্রম" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {visibleBuyers.map(b => {
                  const isPaid = b.is_paid || b.total_due <= 0;
                  return (
                  <tr key={b.buyer_name} className={`border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors ${
                    selectedBuyer === b.buyer_name ? "bg-primary/5" : ""
                  } ${isPaid ? "opacity-60" : ""}`}
                    onClick={() => setSelectedBuyer(b.buyer_name)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{b.buyer_name}</span>
                        <span className="text-[10px] text-muted-foreground">({b.sale_count})</span>
                        {isPaid && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border-2 border-success text-success text-[10px] font-bold tracking-widest rotate-[-4deg] select-none">
                            <CheckCircle2 className="w-3 h-3" /> PAID
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">{fmt(b.total_sales)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${isPaid ? "text-success" : "text-destructive"}`}>
                      {isPaid ? (lang === "bn" ? "পরিশোধিত" : "Cleared") : fmt(b.total_due)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={e => { e.stopPropagation(); toggleBuyerPaid(b); }}
                          title={b.is_paid ? "PAID সিল সরান" : "PAID চিহ্নিত করুন"}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                            b.is_paid
                              ? "border-success bg-success/10 text-success hover:bg-success/20"
                              : "border-border bg-secondary/50 text-muted-foreground hover:border-success/50 hover:text-success"
                          }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {b.is_paid ? "পরিশোধিত" : "PAID"}
                        </button>
                        {!isPaid && (
                          <button onClick={e => { e.stopPropagation(); setSelectedBuyer(b.buyer_name); setShowPayForm(true); }}
                            className="px-2 py-1 rounded text-[10px] bg-success/10 text-success hover:bg-success/20 transition-colors">
                            <Plus className="w-3 h-3 inline mr-0.5" />{lang === "bn" ? "পেমেন্ট" : "Pay"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {visibleBuyers.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{lang === "bn" ? "কোন বকেয়া নেই" : "No outstanding dues"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel - Payment History / Form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {showPayForm && selectedBuyer ? (
            <>
              <h3 className="text-sm font-semibold text-foreground">{lang === "bn" ? `${selectedBuyer} — পেমেন্ট রেকর্ড` : `${selectedBuyer} — Record Payment`}</h3>
              <div className="space-y-3">
                <input type="number" placeholder={lang === "bn" ? "পরিমাণ" : "Amount"} value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  aria-label={lang === "bn" ? "পেমেন্ট পদ্ধতি" : "Payment method"}
                  title={lang === "bn" ? "পেমেন্ট পদ্ধতি" : "Payment method"}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="cash">{lang === "bn" ? "নগদ" : "Cash"}</option>
                  <option value="bank">{lang === "bn" ? "ব্যাংক" : "Bank"}</option>
                  <option value="bkash">{lang === "bn" ? "বিকাশ" : "bKash"}</option>
                </select>
                <input placeholder={lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note (optional)"} value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
                <div className="flex gap-2">
                  <button onClick={handlePayment} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                    {lang === "bn" ? "সংরক্ষণ" : "Save"}
                  </button>
                  <button onClick={() => setShowPayForm(false)} className="h-9 px-3 rounded-lg border border-border text-xs hover:bg-secondary">
                    {lang === "bn" ? "বাতিল" : "Cancel"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <History className="w-4 h-4" />
                {selectedBuyer ? `${selectedBuyer} — ${lang === "bn" ? "পেমেন্ট ইতিহাস" : "Payment History"}` : (lang === "bn" ? "পেমেন্ট ইতিহাস" : "Payment History")}
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {(selectedBuyer ? buyerPayments : payments.slice(0, 20)).map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs border-b border-border/50 pb-2">
                    <div>
                      <p className="font-medium text-foreground">{p.buyer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.payment_date} • {p.payment_method}</p>
                      {p.notes && <p className="text-[10px] text-muted-foreground">{p.notes}</p>}
                    </div>
                    <span className="font-semibold text-success">{fmt(Number(p.amount))}</span>
                  </div>
                ))}
                {(selectedBuyer ? buyerPayments : payments).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{lang === "bn" ? "কোন পেমেন্ট নেই" : "No payments yet"}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerDueModule;
