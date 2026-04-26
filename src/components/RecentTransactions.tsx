import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

type TxRow = {
  id: string;
  type: string;
  desc: string;
  amount: string;
  status: string;
  date: string;
};

const statusStyles: Record<string, string> = {
  completed: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  unpaid: "bg-warning/15 text-warning",
  partial: "bg-info/15 text-info",
  "in_transit": "bg-info/15 text-info",
  "in-transit": "bg-info/15 text-info",
};

const typeStyles: Record<string, string> = {
  Purchase: "text-info",
  Sale: "text-success",
  Transfer: "text-primary",
  Cash: "text-warning",
};

const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");

const RecentTransactions = () => {
  const { t } = useLanguage();
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: purchases }, { data: sales }, { data: transfers }, { data: cash }] = await Promise.all([
        supabase.from("purchases").select("id, purchase_date, supplier_name, total_price, currency, payment_status").order("created_at", { ascending: false }).limit(5),
        supabase.from("sales").select("id, sale_date, buyer_name, grade, total_amount, due_amount").order("created_at", { ascending: false }).limit(5),
        supabase.from("transfers").select("id, transfer_date, weight_kg, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("cash_entries").select("id, entry_date, entry_type, amount, category, person_name").order("created_at", { ascending: false }).limit(5),
      ]);

      const rows: (TxRow & { sortDate: string })[] = [];

      (purchases || []).forEach(p => rows.push({
        id: p.id.slice(0, 8).toUpperCase(),
        type: "Purchase",
        desc: p.supplier_name,
        amount: (p.currency === "INR" ? "₹" : "৳") + Number(p.total_price).toLocaleString("en-IN"),
        status: p.payment_status,
        date: p.purchase_date,
        sortDate: p.purchase_date,
      }));

      (sales || []).forEach(s => rows.push({
        id: s.id.slice(0, 8).toUpperCase(),
        type: "Sale",
        desc: `${s.buyer_name} — ${s.grade}`,
        amount: fmt(Number(s.total_amount)),
        status: Number(s.due_amount) > 0 ? "pending" : "completed",
        date: s.sale_date,
        sortDate: s.sale_date,
      }));

      (transfers || []).forEach(tr => rows.push({
        id: tr.id.slice(0, 8).toUpperCase(),
        type: "Transfer",
        desc: `${tr.weight_kg} KG`,
        amount: `${tr.weight_kg} KG`,
        status: tr.status,
        date: tr.transfer_date,
        sortDate: tr.transfer_date,
      }));

      (cash || []).forEach(c => rows.push({
        id: c.id.slice(0, 8).toUpperCase(),
        type: "Cash",
        desc: `${c.category}${c.person_name ? " — " + c.person_name : ""}`,
        amount: (c.entry_type === "in" ? "+" : "-") + fmt(Number(c.amount)),
        status: "completed",
        date: c.entry_date,
        sortDate: c.entry_date,
      }));

      rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
      setTxs(rows.slice(0, 10));
      setLoading(false);
    };
    fetchAll();
  }, []);

  return (
    <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">{t("recentTransactions")}</h3>
      <p className="text-xs text-muted-foreground mb-4">{t("latestActivity")}</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : txs.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">{t("date")}</th>
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">{t("type")}</th>
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4">{t("description")}</th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2 pr-4">{t("amount")}</th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={tx.id + i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{tx.date}</td>
                  <td className={`py-3 pr-4 text-xs font-medium ${typeStyles[tx.type] || ""}`}>{tx.type}</td>
                  <td className="py-3 pr-4 text-xs text-foreground">{tx.desc}</td>
                  <td className="py-3 pr-4 text-xs text-right font-medium text-foreground">{tx.amount}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusStyles[tx.status] || "bg-secondary text-muted-foreground"}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
