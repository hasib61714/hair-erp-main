import { useQuery } from "@tanstack/react-query";
import { Scissors } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/loading-skeleton";
import EmptyState from "@/components/ui/empty-state";

const fetchGrades = async () => {
  const { data } = await supabase
    .from("inventory")
    .select("grade, stock_kg, rate_per_kg")
    .order("grade", { ascending: true });
  return data ?? [];
};

const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");

const GradeInventory = () => {
  const { t } = useLanguage();

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["grade-inventory"],
    queryFn: fetchGrades,
    staleTime: 60_000,
  });

  const totalStock = grades.reduce((s, g) => s + Number(g.stock_kg), 0);
  const maxStock   = Math.max(...grades.map(g => Number(g.stock_kg)), 1);
  const lowCount   = grades.filter(g => Number(g.stock_kg) < 10).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scissors className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">{t("gradeWiseInventory")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("stockByHairLength")}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
            {t("total")}: <span className="text-foreground font-semibold">{Math.round(totalStock)} KG</span>
          </span>
          {lowCount > 0 && (
            <span className="badge-danger text-[10px]">
              {lowCount} {t("lowStock")}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-4 rounded" />
              <Skeleton className="flex-1 h-6 rounded-lg" />
              <Skeleton className="w-14 h-4 rounded" />
            </div>
          ))
        ) : grades.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title={t("noData")}
            compact
          />
        ) : (
          grades.map(g => {
            const stock = Number(g.stock_kg);
            const pct   = Math.max((stock / maxStock) * 100, 2);
            const isLow = stock < 10;
            return (
              <div key={`${g.grade}-${g.rate_per_kg}`} className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono font-semibold text-muted-foreground w-9 shrink-0 text-right">
                  {g.grade}
                </span>
                <div className="flex-1 h-6 bg-secondary/60 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 bar-fill ${isLow ? "bg-destructive/50" : "bg-primary/35"}`}
                    style={{ "--bar-width": `${pct}%` } as React.CSSProperties}
                  />
                  <span className="absolute inset-0 flex items-center px-2.5 text-[11px] font-semibold text-foreground">
                    {stock} KG
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0 tabular-nums">
                  {fmt(Number(g.rate_per_kg))}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GradeInventory;
