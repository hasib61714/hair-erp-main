import { useQuery } from "@tanstack/react-query";
import {
  Package, Factory, Wallet, Users, TrendingUp, Layers,
  ArrowRightLeft, AlertTriangle, Activity,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import ProductionFlow from "@/components/ProductionFlow";
import GradeInventory from "@/components/GradeInventory";
import FactorySummary from "@/components/FactorySummary";
import RecentTransactions from "@/components/RecentTransactions";
import CashSummary from "@/components/CashSummary";
import { StatsGridSkeleton, Skeleton } from "@/components/ui/loading-skeleton";

// ── Data fetching ─────────────────────────────────────────────────
const fetchDashboardStats = async () => {
  const [
    { data: inv },
    { data: factories },
    { data: cashIn },
    { data: cashOut },
    { data: salesDues },
    { data: partyDues },
    { data: batches },
    { data: transfers },
    { data: buyers },
  ] = await Promise.all([
    supabase.from("inventory").select("stock_kg"),
    supabase.from("factories").select("name, is_active"),
    supabase.from("cash_entries").select("amount").eq("entry_type", "in"),
    supabase.from("cash_entries").select("amount").eq("entry_type", "out"),
    supabase.from("sales").select("due_amount").gt("due_amount", 0),
    supabase.from("party_settlements").select("due").gt("due", 0),
    supabase.from("production_batches").select("status, efficiency_pct"),
    supabase.from("transfers").select("status").eq("status", "in_transit"),
    supabase.from("sales").select("buyer_name"),
  ]);

  const totalStock = (inv ?? []).reduce((s, r) => s + Number(r.stock_kg ?? 0), 0);
  const activeFactories = (factories ?? []).filter(f => f.is_active);
  const totalCashIn  = (cashIn  ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalCashOut = (cashOut ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const salesDueTotal = (salesDues ?? []).reduce((s, r) => s + Number(r.due_amount ?? 0), 0);
  const partyDueTotal = (partyDues ?? []).reduce((s, r) => s + Number(r.due ?? 0), 0);
  const activeBatches = (batches ?? []).filter(b => b.status === "in_progress");
  const avgEfficiency = activeBatches.length > 0
    ? Math.round(activeBatches.reduce((s, b) => s + Number(b.efficiency_pct ?? 0), 0) / activeBatches.length)
    : 0;
  const uniqueBuyers = new Set((buyers ?? []).map(b => b.buyer_name)).size;

  return {
    totalRawStock:       Math.round(totalStock),
    activeFactories:     activeFactories.length,
    totalFactories:      (factories ?? []).length,
    activeFactoryNames:  activeFactories.map(f => f.name).join(", ") || "—",
    cashBalance:         totalCashIn - totalCashOut,
    pendingDues:         salesDueTotal + partyDueTotal,
    dueCount:            `${(salesDues ?? []).length} buyers · ${(partyDues ?? []).length} party`,
    activeBatches:       activeBatches.length,
    avgEfficiency,
    activeBuyers:        uniqueBuyers,
    pendingTransfers:    (transfers ?? []).length,
  };
};

const fmt = (n: number) =>
  "৳" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ── Secondary metric card ─────────────────────────────────────────
const MetricTile = ({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-1.5 text-center shadow-card hover:border-primary/20 hover:shadow-md transition-all duration-200">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-primary/10" : "bg-secondary"}`}>
      <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <p className={`text-xl font-bold leading-none ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const MetricTileSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2 shadow-card">
    <Skeleton className="w-8 h-8 rounded-lg" />
    <Skeleton className="w-12 h-6 rounded" />
    <Skeleton className="w-20 h-3 rounded" />
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────
const DashboardContent = () => {
  const { t } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* ── KPI row ─────────────────────────────────────────── */}
      {isLoading ? (
        <StatsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            icon={Package}
            title={t("totalRawStock")}
            value={`${stats?.totalRawStock ?? 0} KG`}
            subtitle={t("acrossAllFactories")}
            variant="gold"
          />
          <StatsCard
            icon={Factory}
            title={t("activeFactories")}
            value={`${stats?.activeFactories ?? 0} / ${stats?.totalFactories ?? 0}`}
            subtitle={stats?.activeFactoryNames ?? "—"}
            variant="info"
          />
          <StatsCard
            icon={Wallet}
            title={t("todaysCashBalance")}
            value={fmt(stats?.cashBalance ?? 0)}
            subtitle={t("afterAllTransactions")}
            variant={stats && stats.cashBalance >= 0 ? "success" : "danger"}
          />
          <StatsCard
            icon={AlertTriangle}
            title={t("pendingDues")}
            value={fmt(stats?.pendingDues ?? 0)}
            subtitle={stats?.dueCount ?? ""}
            variant={stats && stats.pendingDues > 0 ? "danger" : "default"}
          />
        </div>
      )}

      {/* ── Production pipeline ──────────────────────────── */}
      <ProductionFlow />

      {/* ── Inventory + Cash ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GradeInventory />
        <CashSummary />
      </div>

      {/* ── Secondary metrics row ────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <MetricTileSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricTile icon={Layers}         label={t("activeBatches")}    value={stats?.activeBatches ?? 0}    accent />
          <MetricTile icon={TrendingUp}      label={t("avgEfficiency")}    value={`${stats?.avgEfficiency ?? 0}%`} />
          <MetricTile icon={Users}           label={t("activeBuyers")}     value={stats?.activeBuyers ?? 0} />
          <MetricTile icon={ArrowRightLeft}  label={t("pendingTransfers")} value={stats?.pendingTransfers ?? 0}
            accent={!!stats?.pendingTransfers} />
        </div>
      )}

      {/* ── Activity feed + Factory overview ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <RecentTransactions />
        </div>
        <div className="xl:col-span-2">
          <FactorySummary />
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border pt-4">
          <Activity className="w-3.5 h-3.5 text-success" />
          <span>
            {t("activeFactories")}: <strong className="text-foreground">{stats?.activeFactories}</strong>
            &nbsp;·&nbsp;
            {t("activeBatches")}: <strong className="text-foreground">{stats?.activeBatches}</strong>
            &nbsp;·&nbsp;
            {t("pendingTransfers")}: <strong className="text-foreground">{stats?.pendingTransfers}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
