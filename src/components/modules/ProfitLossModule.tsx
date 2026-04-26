import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

const ProfitLossModule = () => {
  const { t, lang } = useLanguage();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => `${new Date().getFullYear()}`);
  const [data, setData] = useState<any>({
    totalPurchase: 0, totalSales: 0, totalCashIn: 0, totalCashOut: 0,
    purchaseCount: 0, salesCount: 0, grossProfit: 0, netProfit: 0,
    expenses: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const prefix = period === "monthly" ? selectedMonth : selectedYear;

      const [{ data: purchases }, { data: sales }, { data: cashEntries }] = await Promise.all([
        supabase.from("purchases").select("total_price, purchase_date").like("purchase_date", `${prefix}%`),
        supabase.from("sales").select("total_amount, sale_date").like("sale_date", `${prefix}%`),
        supabase.from("cash_entries").select("entry_type, amount, category, entry_date").like("entry_date", `${prefix}%`),
      ]);

      const totalPurchase = (purchases || []).reduce((s, r) => s + Number(r.total_price || 0), 0);
      const totalSales = (sales || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const totalCashIn = (cashEntries || []).filter(e => e.entry_type === "in").reduce((s, e) => s + Number(e.amount), 0);
      const totalCashOut = (cashEntries || []).filter(e => e.entry_type === "out").reduce((s, e) => s + Number(e.amount), 0);

      const expenses: Record<string, number> = {};
      (cashEntries || []).filter(e => e.entry_type === "out").forEach(e => {
        expenses[e.category] = (expenses[e.category] || 0) + Number(e.amount);
      });

      const grossProfit = totalSales - totalPurchase;
      const netProfit = grossProfit - totalCashOut + totalCashIn;

      setData({
        totalPurchase, totalSales, totalCashIn, totalCashOut,
        purchaseCount: (purchases || []).length,
        salesCount: (sales || []).length,
        grossProfit, netProfit, expenses,
      });
      setLoading(false);
    };
    fetchData();
  }, [period, selectedMonth, selectedYear]);

  const fmt = (n: number) => "৳" + Math.abs(n).toLocaleString("en-IN");
  const isProfit = (n: number) => n >= 0;

  const months = Array.from({ length: 12 }, (_, i) => {
    const y = new Date().getFullYear();
    const m = String(i + 1).padStart(2, "0");
    return { value: `${y}-${m}`, label: new Date(y, i).toLocaleDateString(lang === "bn" ? "bn-BD" : "en", { month: "long", year: "numeric" }) };
  });

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: `${y}`, label: `${y}` };
  });

  if (loading) return <div className="text-center py-10 text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{lang === "bn" ? "লাভ-ক্ষতি রিপোর্ট" : "Profit & Loss Report"}</h2>
          <p className="text-xs text-muted-foreground">{lang === "bn" ? "ক্রয়-বিক্রয় থেকে অটো ক্যালকুলেশন" : "Auto calculation from purchases & sales"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setPeriod("monthly")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              {lang === "bn" ? "মাসিক" : "Monthly"}
            </button>
            <button onClick={() => setPeriod("yearly")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              {lang === "bn" ? "বার্ষিক" : "Yearly"}
            </button>
          </div>
          {period === "monthly" ? (
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          ) : (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
              {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">{lang === "bn" ? "মোট ক্রয়" : "Total Purchase"}</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(data.totalPurchase)}</p>
          <p className="text-[10px] text-muted-foreground">{data.purchaseCount} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">{lang === "bn" ? "মোট বিক্রয়" : "Total Sales"}</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(data.totalSales)}</p>
          <p className="text-[10px] text-muted-foreground">{data.salesCount} {lang === "bn" ? "টি এন্ট্রি" : "entries"}</p>
        </div>
        <div className={`rounded-xl border p-4 ${isProfit(data.grossProfit) ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">{lang === "bn" ? "গ্রস প্রফিট" : "Gross Profit"}</span>
          </div>
          <p className={`text-lg font-bold ${isProfit(data.grossProfit) ? "text-success" : "text-destructive"}`}>
            {isProfit(data.grossProfit) ? "+" : "-"}{fmt(data.grossProfit)}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${isProfit(data.netProfit) ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">{lang === "bn" ? "নেট প্রফিট" : "Net Profit"}</span>
          </div>
          <p className={`text-lg font-bold ${isProfit(data.netProfit) ? "text-success" : "text-destructive"}`}>
            {isProfit(data.netProfit) ? "+" : "-"}{fmt(data.netProfit)}
          </p>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{lang === "bn" ? "ক্যাশ ফ্লো সামারি" : "Cash Flow Summary"}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{lang === "bn" ? "মোট ক্যাশ ইন" : "Total Cash In"}</span>
              <span className="text-success font-medium">+{fmt(data.totalCashIn)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{lang === "bn" ? "মোট ক্যাশ আউট" : "Total Cash Out"}</span>
              <span className="text-destructive font-medium">-{fmt(data.totalCashOut)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
              <span>{lang === "bn" ? "নেট ক্যাশ ফ্লো" : "Net Cash Flow"}</span>
              <span className={data.totalCashIn - data.totalCashOut >= 0 ? "text-success" : "text-destructive"}>
                {fmt(data.totalCashIn - data.totalCashOut)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{lang === "bn" ? "ক্যাটাগরি অনুযায়ী খরচ" : "Expenses by Category"}</h3>
          <div className="space-y-2">
            {Object.entries(data.expenses).length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noData")}</p>
            ) : (
              Object.entries(data.expenses).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{cat}</span>
                  <span className="text-foreground font-medium">{fmt(amt as number)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossModule;
