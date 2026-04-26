import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Factory, TrendingUp, Package } from "lucide-react";

type FactoryRow = {
  id: string;
  name: string;
  factory_type: string;
  location: string;
  is_active: boolean;
  stock: number;
  batches: number;
  efficiency: number;
};

const FactorySummary = () => {
  const { t } = useLanguage();
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: facs }, { data: inv }, { data: batches }] = await Promise.all([
        supabase.from("factories").select("id, name, factory_type, location, is_active"),
        supabase.from("inventory").select("factory_id, stock_kg"),
        supabase.from("production_batches").select("factory_id, status, efficiency_pct"),
      ]);

      const result = (facs || []).map(f => {
        const stock = (inv || []).filter(i => i.factory_id === f.id).reduce((s, i) => s + Number(i.stock_kg), 0);
        const facBatches = (batches || []).filter(b => b.factory_id === f.id && b.status === "in_progress");
        const avgEff = facBatches.length > 0
          ? Math.round(facBatches.reduce((s, b) => s + Number(b.efficiency_pct || 0), 0) / facBatches.length)
          : 0;
        return {
          id: f.id,
          name: `${f.name} — ${f.location}`,
          factory_type: f.factory_type === "head_office" ? "Final Processing" : "Kachi Processing",
          location: f.location,
          is_active: f.is_active,
          stock: Math.round(stock),
          batches: facBatches.length,
          efficiency: avgEff,
        };
      });

      setFactories(result);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">{t("factoryOverview")}</h3>
      <p className="text-xs text-muted-foreground mb-4">{t("allLocations")}</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : factories.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="space-y-3">
          {factories.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{f.name}</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${f.is_active ? "bg-success animate-pulse-gold" : "bg-muted-foreground"}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">{f.factory_type}</p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="w-3 h-3" /><span>{f.stock} KG</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>{f.batches} Batches</span>
                </div>
                <div className="flex items-center gap-1 text-success ml-auto">
                  <TrendingUp className="w-3 h-3" /><span>{f.efficiency}%</span>
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
