import { useQuery } from "@tanstack/react-query";
import { Factory, TrendingUp, Package, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import EmptyState from "@/components/ui/empty-state";

type FactoryRow = {
  id: string;
  name: string;
  location: string;
  factory_type: string;
  is_active: boolean;
  stock: number;
  batches: number;
  efficiency: number;
};

const fetchFactories = async (): Promise<FactoryRow[]> => {
  const [{ data: facs }, { data: inv }, { data: batches }] = await Promise.all([
    supabase.from("factories").select("id, name, factory_type, location, is_active"),
    supabase.from("inventory").select("factory_id, stock_kg"),
    supabase.from("production_batches").select("factory_id, status, efficiency_pct"),
  ]);

  return (facs ?? []).map(f => {
    const stock = (inv ?? [])
      .filter(i => i.factory_id === f.id)
      .reduce((s, i) => s + Number(i.stock_kg), 0);
    const active = (batches ?? []).filter(b => b.factory_id === f.id && b.status === "in_progress");
    const avgEff = active.length > 0
      ? Math.round(active.reduce((s, b) => s + Number(b.efficiency_pct ?? 0), 0) / active.length)
      : 0;
    return {
      id: f.id,
      name: f.name,
      location: f.location,
      factory_type: f.factory_type === "head_office" ? "Final Processing" : "Kachi Processing",
      is_active: f.is_active,
      stock: Math.round(stock),
      batches: active.length,
      efficiency: avgEff,
    };
  });
};

const FactorySummary = () => {
  const { t } = useLanguage();

  const { data: factories = [], isLoading } = useQuery({
    queryKey: ["factory-summary"],
    queryFn: fetchFactories,
    staleTime: 60_000,
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Factory className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">{t("factoryOverview")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("allLocations")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : factories.length === 0 ? (
        <EmptyState icon={Factory} title={t("noData")} compact />
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {factories.map(f => (
            <div
              key={f.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                f.is_active
                  ? "border-border bg-secondary/30 hover:border-primary/25"
                  : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${f.is_active ? "bg-primary/10" : "bg-muted"}`}>
                    <Factory className={`w-3.5 h-3.5 ${f.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{f.location}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  f.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${f.is_active ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                  {f.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground mb-2.5">{f.factory_type}</p>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground tabular-nums">{f.stock} KG</p>
                    <p className="text-[9px] text-muted-foreground">Stock</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{f.batches}</p>
                    <p className="text-[9px] text-muted-foreground">Batches</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`w-3 h-3 shrink-0 ${f.efficiency > 0 ? "text-success" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-[11px] font-semibold ${f.efficiency > 0 ? "text-success" : "text-muted-foreground"}`}>
                      {f.efficiency > 0 ? `${f.efficiency}%` : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Eff.</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FactorySummary;
