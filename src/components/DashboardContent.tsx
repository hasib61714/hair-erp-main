import { useState, useEffect } from "react";
import { Package, Factory, Wallet, Users, TrendingUp, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import ProductionFlow from "@/components/ProductionFlow";
import GradeInventory from "@/components/GradeInventory";
import FactorySummary from "@/components/FactorySummary";
import RecentTransactions from "@/components/RecentTransactions";
import CashSummary from "@/components/CashSummary";

type DashboardStats = {
  totalRawStock: number;
  activeFactories: number;
  totalFactories: number;
  cashBalance: number;
  pendingDues: number;
  dueCount: string;
  activeBatches: number;
  avgEfficiency: number;
  activeBuyers: number;
  pendingTransfers: number;
  activeFactoryNames: string;
};

const INITIAL_STATS: DashboardStats = {
  totalRawStock: 0,
  activeFactories: 0,
  totalFactories: 0,
  cashBalance: 0,
  pendingDues: 0,
  dueCount: "",
  activeBatches: 0,
  avgEfficiency: 0,
  activeBuyers: 0,
  pendingTransfers: 0,
  activeFactoryNames: "",
};

const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");

const DashboardContent = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { data: inv },
        { data: factories },
        { data: cashEntries },
        { data: salesDues },
        { data: partyDues },
        { data: batches },
        { data: transfers },
        { data: buyers },
      ] = await Promise.all([
        supabase.from("inventory").select("stock_kg"),
        supabase.from("factories").select("name, is_active"),
        supabase.from("cash_entries").select("entry_type, amount"),
        supabase.from("sales").select("due_amount").gt("due_amount", 0),
        supabase.from("party_settlements").select("due").gt("due", 0),
        supabase.from("production_batches").select("status, efficiency_pct"),
        supabase.from("transfers").select("status").eq("status", "in_transit"),
        supabase.from("sales").select("buyer_name"),
      ]);

      const totalStock = (inv ?? []).reduce((s, r) => s + Number(r.stock_kg ?? 0), 0);
      const activeF = (factories ?? []).filter(f => f.is_active);
      const cashIn = (cashEntries ?? [])
        .filter(e => e.entry_type === "in")
        .reduce((s, e) => s + Number(e.amount), 0);
      const cashOut = (cashEntries ?? [])
        .filter(e => e.entry_type === "out")
        .reduce((s, e) => s + Number(e.amount), 0);
      const salesDueTotal = (salesDues ?? []).reduce((s, r) => s + Number(r.due_amount ?? 0), 0);
      const partyDueTotal = (partyDues ?? []).reduce((s, r) => s + Number(r.due ?? 0), 0);
      const activeBatches = (batches ?? []).filter(b => b.status === "in_progress");
      const avgEff =
        activeBatches.length > 0
          ? Math.round(
              activeBatches.reduce((s, b) => s + Number(b.efficiency_pct ?? 0), 0) /
                activeBatches.length
            )
          : 0;
      const uniqueBuyers = new Set((buyers ?? []).map(b => b.buyer_name)).size;

      setStats({
        totalRawStock: Math.round(totalStock),
        activeFactories: activeF.length,
        totalFactories: (factories ?? []).length,
        cashBalance: cashIn - cashOut,
        pendingDues: salesDueTotal + partyDueTotal,
        dueCount: `${(salesDues ?? []).length} buyers, ${(partyDues ?? []).length} party`,
        activeBatches: activeBatches.length,
        avgEfficiency: avgEff,
        activeBuyers: uniqueBuyers,
        pendingTransfers: (transfers ?? []).length,
        activeFactoryNames: activeF.map(f => f.name).join(", "),
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          icon={Package}
          title={t("totalRawStock")}
          value={`${stats.totalRawStock} KG`}
          subtitle={t("acrossAllFactories")}
          variant="gold"
        />
        <StatsCard
          icon={Factory}
          title={t("activeFactories")}
          value={`${stats.activeFactories} / ${stats.totalFactories}`}
          subtitle={stats.activeFactoryNames || "—"}
          variant="info"
        />
        <StatsCard
          icon={Wallet}
          title={t("todaysCashBalance")}
          value={fmt(stats.cashBalance)}
          subtitle={t("afterAllTransactions")}
          variant="success"
        />
        <StatsCard
          icon={Users}
          title={t("pendingDues")}
          value={fmt(stats.pendingDues)}
          subtitle={stats.dueCount}
          variant="default"
        />
      </div>

      <ProductionFlow />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GradeInventory />
        <CashSummary />
      </div>

      <RecentTransactions />
      <FactorySummary />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Layers className="w-5 h-5 mx-auto text-primary mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.activeBatches}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("activeBatches")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-success mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.avgEfficiency}%</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("avgEfficiency")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-info mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.activeBuyers}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("activeBuyers")}</p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-card p-3 md:p-4 text-center">
          <Package className="w-5 h-5 mx-auto text-warning mb-2" />
          <p className="text-base md:text-lg font-bold text-foreground">{stats.pendingTransfers}</p>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">{t("pendingTransfers")}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
