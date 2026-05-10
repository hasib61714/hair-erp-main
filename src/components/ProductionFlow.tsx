import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/loading-skeleton";

const fetchFlow = async () => {
  const [{ data: inv }, { data: batches }] = await Promise.all([
    supabase.from("inventory").select("product_type, stock_kg"),
    supabase.from("production_batches").select("status, efficiency_pct, output_kg, input_kg"),
  ]);

  const sum = (type: string) =>
    (inv ?? []).filter(r => r.product_type === type).reduce((s, r) => s + Number(r.stock_kg), 0);

  const gutiKg     = Math.round(sum("guti"));
  const kachiKg    = Math.round(sum("kachi"));
  const twobytwoKg = Math.round(sum("two_by_two"));

  const active = (batches ?? []).filter(b => b.status === "in_progress");
  const avgEff = active.length > 0
    ? Math.round(active.reduce((s, b) => s + Number(b.efficiency_pct ?? 0), 0) / active.length)
    : null;

  return { gutiKg, kachiKg, twobytwoKg, avgEff, activeBatches: active.length };
};

const ProductionFlow = () => {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["production-flow"],
    queryFn: fetchFlow,
    staleTime: 60_000,
  });

  const stages = [
    {
      label: t("raw"),
      sub: "Guti",
      value: data ? `${data.gutiKg} KG` : "—",
      color: "border-info/30 bg-info/8 text-info",
      dot: "bg-info",
    },
    {
      label: t("processed"),
      sub: "Kachi",
      value: data ? `${data.kachiKg} KG` : "—",
      color: "border-warning/30 bg-warning/8 text-warning",
      dot: "bg-warning",
    },
    {
      label: t("final"),
      sub: "2×2",
      value: data ? `${data.twobytwoKg} KG` : "—",
      color: "border-success/30 bg-success/8 text-success",
      dot: "bg-success",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">{t("productionFlow")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("multiStageProcessing")}</p>
          </div>
        </div>
        {!isLoading && data?.avgEff !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-[11px] text-muted-foreground">{t("efficiency")}</span>
            <span className="text-sm font-bold text-primary">{data?.avgEff}%</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {isLoading
          ? [0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <Skeleton className="w-[130px] h-[72px] rounded-xl" />
                {i < 2 && <Skeleton className="w-5 h-5 rounded-full" />}
              </div>
            ))
          : stages.map((stage, i) => (
              <div key={stage.sub} className="flex items-center gap-2 shrink-0">
                <div className={`rounded-xl border px-4 py-3 min-w-[130px] ${stage.color}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                    <span className="text-[11px] font-medium opacity-80">{stage.sub}</span>
                  </div>
                  <p className="text-[11px] text-current opacity-70 mb-0.5">{stage.label}</p>
                  <p className="text-lg font-bold">{stage.value}</p>
                </div>
                {i < stages.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            ))}

        {!isLoading && data && data.activeBatches > 0 && (
          <>
            <div className="w-px h-10 bg-border mx-1 shrink-0" />
            <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2 shrink-0 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">{t("activeBatches")}</p>
              <p className="text-base font-bold text-foreground">{data.activeBatches}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionFlow;
