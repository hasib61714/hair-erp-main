import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import EmptyState from "@/components/ui/empty-state";

type TxRow = {
  id: string;
  type: "Purchase" | "Sale" | "Transfer" | "Cash";
  desc: string;
  amount: string;
  status: string;
  date: string;
  sortDate: string;
};

const STATUS_BADGE: Record<string, string> = {
  completed:  "badge-success",
  paid:       "badge-success",
  pending:    "badge-warning",
  unpaid:     "badge-warning",
  partial:    "badge-info",
  in_transit: "badge-info",
};

const TYPE_STYLE: Record<string, string> = {
  Purchase: "bg-info/10 text-info border-info/20",
  Sale:     "bg-success/10 text-success border-success/20",
  Transfer: "bg-primary/10 text-primary border-primary/20",
  Cash:     "bg-warning/10 text-warning border-warning/20",
};

const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");

const fetchTransactions = async (): Promise<TxRow[]> => {
  const [
    { data: purchases },
    { data: sales },
    { data: transfers },
    { data: cash },
  ] = await Promise.all([
    supabase.from("purchases").select("id, purchase_date, supplier_name, total_price, currency, payment_status").order("created_at", { ascending: false }).limit(5),
    supabase.from("sales").select("id, sale_date, buyer_name, grade, total_amount, due_amount").order("created_at", { ascending: false }).limit(5),
    supabase.from("transfers").select("id, transfer_date, weight_kg, status").order("created_at", { ascending: false }).limit(5),
    supabase.from("cash_entries").select("id, entry_date, entry_type, amount, category, person_name").order("created_at", { ascending: false }).limit(5),
  ]);

  const rows: TxRow[] = [];

  (purchases ?? []).forEach(p => rows.push({
    id: p.id.slice(0, 8).toUpperCase(),
    type: "Purchase",
    desc: p.supplier_name,
    amount: (p.currency === "INR" ? "₹" : "৳") + Number(p.total_price).toLocaleString("en-IN"),
    status: p.payment_status,
    date: p.purchase_date,
    sortDate: p.purchase_date,
  }));

  (sales ?? []).forEach(s => rows.push({
    id: s.id.slice(0, 8).toUpperCase(),
    type: "Sale",
    desc: `${s.buyer_name} — ${s.grade}`,
    amount: fmt(Number(s.total_amount)),
    status: Number(s.due_amount) > 0 ? "pending" : "completed",
    date: s.sale_date,
    sortDate: s.sale_date,
  }));

  (transfers ?? []).forEach(tr => rows.push({
    id: tr.id.slice(0, 8).toUpperCase(),
    type: "Transfer",
    desc: `${tr.weight_kg} KG`,
    amount: `${tr.weight_kg} KG`,
    status: tr.status,
    date: tr.transfer_date,
    sortDate: tr.transfer_date,
  }));

  (cash ?? []).forEach(c => rows.push({
    id: c.id.slice(0, 8).toUpperCase(),
    type: "Cash",
    desc: `${c.category}${c.person_name ? " — " + c.person_name : ""}`,
    amount: (c.entry_type === "in" ? "+" : "−") + fmt(Number(c.amount)),
    status: "completed",
    date: c.entry_date,
    sortDate: c.entry_date,
  }));

  return rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 10);
};

const RecentTransactions = () => {
  const { t } = useLanguage();

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: fetchTransactions,
    staleTime: 60_000,
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">{t("recentTransactions")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("latestActivity")}</p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : txs.length === 0 ? (
        <EmptyState icon={Activity} title={t("noData")} compact />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-cell pl-1">{t("date")}</th>
                <th className="table-header-cell">{t("type")}</th>
                <th className="table-header-cell">{t("description")}</th>
                <th className="table-header-cell text-right">{t("amount")}</th>
                <th className="table-header-cell text-right pr-1">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={`${tx.id}-${i}`} className="table-row-hover">
                  <td className="table-cell pl-1 text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${TYPE_STYLE[tx.type]}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="table-cell max-w-[160px] truncate text-xs">{tx.desc}</td>
                  <td className="table-cell text-right font-semibold text-xs tabular-nums whitespace-nowrap">
                    {tx.amount}
                  </td>
                  <td className="table-cell text-right pr-1">
                    <span className={STATUS_BADGE[tx.status] ?? "badge-neutral"}>
                      {tx.status.replace("_", " ")}
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
