import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Banknote } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/loading-skeleton";

// entry_type values in DB are "in" and "out"
const fetchCash = async () => {
  const { data } = await supabase.from("cash_entries").select("entry_type, amount");
  const rows = data ?? [];
  const totalIn  = rows.filter(e => e.entry_type === "in").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = rows.filter(e => e.entry_type === "out").reduce((s, e) => s + Number(e.amount), 0);
  return { totalIn, totalOut, closing: totalIn - totalOut };
};

const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");

const CashSummary = () => {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["cash-summary"],
    queryFn: fetchCash,
    staleTime: 60_000,
  });

  const tiles = [
    {
      icon: Banknote,
      label: t("opening"),
      value: "৳0",
      cls: "bg-secondary/60 text-foreground",
      iconCls: "text-muted-foreground",
    },
    {
      icon: ArrowDownCircle,
      label: t("cashIn"),
      value: fmt(data?.totalIn ?? 0),
      cls: "bg-success/8 border border-success/20 text-success",
      iconCls: "text-success",
    },
    {
      icon: ArrowUpCircle,
      label: t("cashOut"),
      value: fmt(data?.totalOut ?? 0),
      cls: "bg-destructive/8 border border-destructive/20 text-destructive",
      iconCls: "text-destructive",
    },
    {
      icon: Wallet,
      label: t("closing"),
      value: fmt(data?.closing ?? 0),
      cls: "bg-primary/10 border border-primary/25 text-primary",
      iconCls: "text-primary",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">{t("todaysCashFlow")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("afterAllTransactions")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(tile => (
          <div key={tile.label} className={`rounded-xl p-3.5 ${tile.cls}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <tile.icon className={`w-3.5 h-3.5 ${tile.iconCls}`} />
              <span className="text-[11px] opacity-75 font-medium">{tile.label}</span>
            </div>
            {isLoading && tile.label !== t("opening") ? (
              <Skeleton className="w-20 h-5 rounded" />
            ) : (
              <p className="text-[15px] font-bold leading-none tabular-nums">{tile.value}</p>
            )}
          </div>
        ))}
      </div>

      {!isLoading && data && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{t("cashIn")} vs {t("cashOut")}</span>
          <div className="flex-1 mx-3 h-1.5 rounded-full bg-secondary overflow-hidden">
            {data.totalIn + data.totalOut > 0 && (
              <div
                className="h-full bg-success rounded-full transition-all duration-500 bar-fill"
                style={{ "--bar-width": `${(data.totalIn / (data.totalIn + data.totalOut)) * 100}%` } as React.CSSProperties}
              />
            )}
          </div>
          <span className="text-[11px] font-semibold text-success tabular-nums">
            {data.totalIn + data.totalOut > 0
              ? `${Math.round((data.totalIn / (data.totalIn + data.totalOut)) * 100)}%`
              : "—"}
          </span>
        </div>
      )}
    </div>
  );
};

export default CashSummary;
