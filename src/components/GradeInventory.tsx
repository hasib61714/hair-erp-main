import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

type InvRow = { grade: string; stock_kg: number; rate_per_kg: number };

const GradeInventory = () => {
  const { t } = useLanguage();
  const [grades, setGrades] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("inventory")
        .select("grade, stock_kg, rate_per_kg")
        .order("grade", { ascending: true });
      setGrades(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalStock = grades.reduce((s, g) => s + Number(g.stock_kg), 0);
  const maxStock = Math.max(...grades.map(g => Number(g.stock_kg)), 1);

  const fmt = (n: number) => "৳" + n.toLocaleString("en-IN");

  return (
    <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("gradeWiseInventory")}</h3>
          <p className="text-xs text-muted-foreground">{t("stockByHairLength")}</p>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
          {t("total")}: {Math.round(totalStock)} KG
        </span>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : grades.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {grades.map((g) => {
            const stock = Number(g.stock_kg);
            const pct = (stock / maxStock) * 100;
            const isLow = stock < 10;
            return (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{g.grade}</span>
                <div className="flex-1 h-6 bg-secondary/50 rounded-md overflow-hidden relative">
                  <div
                    className={`h-full rounded-md transition-all ${isLow ? "bg-destructive/60" : "bg-primary/40"}`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-foreground">
                    {stock} KG
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground w-16 text-right shrink-0">
                  {fmt(Number(g.rate_per_kg))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradeInventory;
