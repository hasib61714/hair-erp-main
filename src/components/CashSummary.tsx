import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Banknote } from "lucide-react";

const CashSummary = () => {
  const { t } = useLanguage();
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);

  useEffect(() => {
    const fetchCash = async () => {
      const { data } = await supabase.from("cash_entries").select("entry_type, amount");
      if (data) {
        setTotalIn(data.filter(e => e.entry_type === "cash_in").reduce((s, e) => s + Number(e.amount), 0));
        setTotalOut(data.filter(e => e.entry_type === "cash_out").reduce((s, e) => s + Number(e.amount), 0));
      }
    };
    fetchCash();
  }, []);

  const closing = totalIn - totalOut;

  return (
    <div className="rounded-xl border border-primary/20 p-6 bg-gradient-card shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t("todaysCashFlow")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Banknote className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{t("opening")}</span>
          </div>
          <p className="text-sm font-bold text-foreground">৳0</p>
        </div>
        <div className="rounded-lg bg-success/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownCircle className="w-3 h-3 text-success" />
            <span className="text-[11px] text-muted-foreground">{t("cashIn")}</span>
          </div>
          <p className="text-sm font-bold text-success">৳{totalIn.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpCircle className="w-3 h-3 text-destructive" />
            <span className="text-[11px] text-muted-foreground">{t("cashOut")}</span>
          </div>
          <p className="text-sm font-bold text-destructive">৳{totalOut.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3 h-3 text-primary" />
            <span className="text-[11px] text-muted-foreground">{t("closing")}</span>
          </div>
          <p className="text-sm font-bold text-primary">৳{closing.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default CashSummary;
