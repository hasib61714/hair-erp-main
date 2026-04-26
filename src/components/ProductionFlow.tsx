import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductionFlow = () => {
  const { t } = useLanguage();
  
  const stages = [
    { label: t("raw"), weight: "100 KG", color: "bg-info/20 text-info border-info/30" },
    { label: t("processed"), weight: "95 KG", loss: `5 KG ${t("loss")}`, color: "bg-warning/20 text-warning border-warning/30" },
    { label: t("final"), weight: "90 KG", loss: `5 KG ${t("loss")}`, color: "bg-success/20 text-success border-success/30" },
  ];

  return (
    <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">{t("productionFlow")}</h3>
      <p className="text-xs text-muted-foreground mb-5">{t("multiStageProcessing")}</p>
      
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-3 shrink-0">
            <div className={`rounded-lg border px-5 py-4 ${stage.color} min-w-[140px]`}>
              <p className="text-xs font-medium mb-1">{stage.label}</p>
              <p className="text-lg font-bold">{stage.weight}</p>
              {stage.loss && <p className="text-[11px] opacity-70 mt-1">↓ {stage.loss}</p>}
            </div>
            {i < stages.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />}
          </div>
        ))}
        <div className="ml-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 shrink-0">
          <p className="text-[11px] text-muted-foreground">{t("efficiency")}</p>
          <p className="text-lg font-bold text-primary">90%</p>
        </div>
      </div>
    </div>
  );
};

export default ProductionFlow;
