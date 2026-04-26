import { useLanguage } from "@/contexts/LanguageContext";
import { TrendingUp, TrendingDown, BarChart3, Factory } from "lucide-react";

const AnalyticsModule = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("analyticsModule")}</h2>
        <p className="text-xs text-muted-foreground">{t("profitTrend")}</p>
      </div>

      {/* Profit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-success/20 p-5 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <p className="text-xs text-muted-foreground">{t("ownProductionProfit")}</p>
          </div>
          <p className="text-2xl font-bold text-success">৳4,85,000</p>
          <p className="text-[11px] text-muted-foreground mt-1">↑ 12% from last month</p>
        </div>
        <div className="rounded-xl border border-primary/20 p-5 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <p className="text-xs text-muted-foreground">{t("partyProfit")}</p>
          </div>
          <p className="text-2xl font-bold text-primary">৳2,10,000</p>
          <p className="text-[11px] text-muted-foreground mt-1">↑ 8% from last month</p>
        </div>
        <div className="rounded-xl border border-info/20 p-5 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-info" />
            <p className="text-xs text-muted-foreground">{t("commissionIncome")}</p>
          </div>
          <p className="text-2xl font-bold text-info">৳65,000</p>
          <p className="text-[11px] text-muted-foreground mt-1">↓ 3% from last month</p>
        </div>
      </div>

      {/* Factory Efficiency */}
      <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("factoryEfficiency")}</h3>
        <div className="space-y-4">
          {[
            { name: "Dhaka (Two by Two)", efficiency: 92, loss: 8 },
            { name: "Sherpur (Kachi)", efficiency: 88, loss: 12 },
            { name: "Naogaon (Kachi)", efficiency: 85, loss: 15 },
          ].map((f) => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{f.name}</span>
                <span className="text-xs text-success font-medium">{f.efficiency}%</span>
              </div>
              <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-gold rounded-full transition-all" style={{ width: `${f.efficiency}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loss & Currency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("lossAnalysis")}</h3>
          <div className="space-y-3">
            {[
              { stage: "Guti → Kachi", avgLoss: "5.2%", totalLoss: "26 KG" },
              { stage: "Kachi → Two by Two", avgLoss: "5.5%", totalLoss: "22 KG" },
              { stage: "Transport", avgLoss: "0.3%", totalLoss: "2.5 KG" },
            ].map((l) => (
              <div key={l.stage} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <span className="text-xs text-foreground">{l.stage}</span>
                <div className="flex gap-4">
                  <span className="text-xs text-warning">{l.avgLoss}</span>
                  <span className="text-xs text-destructive font-medium">{l.totalLoss}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-6 bg-gradient-card shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("currencyImpact")}</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">INR → BDT Exchange Rate</span>
                <span className="text-xs text-primary font-medium">৳1.18</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Current market rate</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">India Purchases (This Month)</span>
                <span className="text-xs text-foreground font-medium">₹2,85,000</span>
              </div>
              <p className="text-[11px] text-muted-foreground">≈ ৳3,36,300 at current rate</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">Rate Impact on Profit</span>
                <span className="text-xs text-success font-medium">+৳12,000</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Favorable vs last month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModule;
