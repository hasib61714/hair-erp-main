import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Printer, Download, X } from "lucide-react";

type TxRow = {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
};

interface TransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  personType: "supplier" | "buyer" | "party" | "cash";
}

const TransactionDrawer = ({ open, onClose, personName, personType }: TransactionDrawerProps) => {
  const { t } = useLanguage();
  const { settings } = useCompanySettings();
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !personName) return;
    const fetchAll = async () => {
      setLoading(true);
      const rows: TxRow[] = [];

      // Purchases by supplier
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, purchase_date, total_price, currency, payment_status, weight_kg, product_type")
        .eq("supplier_name", personName)
        .order("purchase_date", { ascending: false });

      (purchases || []).forEach(p => rows.push({
        id: p.id,
        date: p.purchase_date,
        type: "ক্রয়",
        description: `${p.weight_kg} KG ${p.product_type}`,
        amount: Number(p.total_price),
        currency: p.currency || "BDT",
        status: p.payment_status,
      }));

      // Sales by buyer
      const { data: sales } = await supabase
        .from("sales")
        .select("id, sale_date, total_amount, due_amount, weight_kg, grade, product_type")
        .eq("buyer_name", personName)
        .order("sale_date", { ascending: false });

      (sales || []).forEach(s => rows.push({
        id: s.id,
        date: s.sale_date,
        type: "বিক্রয়",
        description: `${s.weight_kg} KG ${s.grade}`,
        amount: Number(s.total_amount),
        currency: "BDT",
        status: Number(s.due_amount || 0) > 0 ? "বকেয়া" : "পরিশোধিত",
      }));

      // Cash entries by person
      const { data: cash } = await supabase
        .from("cash_entries")
        .select("id, entry_date, entry_type, amount, category, description")
        .eq("person_name", personName)
        .order("entry_date", { ascending: false });

      (cash || []).forEach(c => rows.push({
        id: c.id,
        date: c.entry_date,
        type: c.entry_type === "cash_in" ? "ক্যাশ ইন" : "ক্যাশ আউট",
        description: c.description || c.category,
        amount: Number(c.amount),
        currency: "BDT",
        status: c.entry_type === "cash_in" ? "জমা" : "খরচ",
      }));

      rows.sort((a, b) => b.date.localeCompare(a.date));
      setTxs(rows);
      setLoading(false);
    };
    fetchAll();
  }, [open, personName]);

  const filtered = txs.filter(tx => {
    if (fromDate && tx.date < fromDate) return false;
    if (toDate && tx.date > toDate) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, tx) => s + tx.amount, 0);
  const getCurrencySymbol = (c: string) => ({ BDT: "৳", INR: "₹", CNY: "¥", USD: "$" }[c] || c);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${personName} - ${t("transactionHistory")}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #222; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>${settings.company_name}</h1>
        <p>${settings.tagline || ""}</p>
        <p>${settings.company_address || ""} | ${settings.company_phone || ""}</p>
      </div>
      <div class="meta">
        <div><strong>${personName}</strong> — ${t("transactionHistory")}</div>
        <div>${fromDate ? fromDate : ""} ${fromDate || toDate ? "—" : ""} ${toDate ? toDate : t("allTime")}</div>
      </div>
      <table>
        <thead><tr><th>${t("date")}</th><th>${t("type")}</th><th>${t("description")}</th><th>${t("amount")}</th><th>${t("status")}</th></tr></thead>
        <tbody>
          ${filtered.map(tx => `<tr><td>${tx.date}</td><td>${tx.type}</td><td>${tx.description}</td><td>${getCurrencySymbol(tx.currency)}${tx.amount.toLocaleString()}</td><td>${tx.status}</td></tr>`).join("")}
          <tr class="total-row"><td colspan="3">${t("total")}</td><td>৳${totalAmount.toLocaleString()}</td><td></td></tr>
        </tbody>
      </table>
      <p style="font-size:10px;color:#999;margin-top:20px;text-align:center">প্রিন্ট তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPdf = () => {
    // Use print-to-pdf via browser
    handlePrint();
  };

  const setQuickFilter = (period: "today" | "month" | "year" | "all") => {
    const now = new Date();
    if (period === "today") {
      const d = now.toISOString().split("T")[0];
      setFromDate(d); setToDate(d);
    } else if (period === "month") {
      setFromDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
      setToDate(now.toISOString().split("T")[0]);
    } else if (period === "year") {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(now.toISOString().split("T")[0]);
    } else {
      setFromDate(""); setToDate("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{personName} — {t("allTransactions")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {(["today", "month", "year", "all"] as const).map(p => (
              <button key={p} onClick={() => setQuickFilter(p === "all" ? "all" : p)}
                className="px-3 py-1 rounded-full text-xs border border-border hover:bg-secondary/50 transition-colors">
                {t(p === "month" ? "thisMonth" : p === "year" ? "thisYear" : p === "today" ? "today" : "allTime")}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("fromDate")}</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("toDate")}</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-secondary/50 px-2 text-xs text-foreground" />
            </div>
          </div>

          {/* Print buttons */}
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
              <Printer className="w-3.5 h-3.5" />{t("print")}
            </button>
            <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-secondary/50">
              <Download className="w-3.5 h-3.5" />{t("downloadPdf")}
            </button>
          </div>

          {/* Transaction list */}
          <div ref={printRef}>
            {loading ? (
              <p className="text-xs text-muted-foreground py-4">{t("loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">{t("noTransactions")}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{filtered.length} টি লেনদেন | মোট: ৳{totalAmount.toLocaleString()}</p>
                {filtered.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-foreground">{tx.type}</p>
                      <p className="text-[11px] text-muted-foreground">{tx.description} • {tx.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">{getCurrencySymbol(tx.currency)}{tx.amount.toLocaleString()}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        tx.status === "paid" || tx.status === "পরিশোধিত" || tx.status === "জমা" ? "bg-success/15 text-success" :
                        tx.status === "unpaid" || tx.status === "বকেয়া" ? "bg-destructive/15 text-destructive" :
                        "bg-warning/15 text-warning"
                      }`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TransactionDrawer;
