import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "gold" | "success" | "info" | "danger";
  loading?: boolean;
}

const variantStyles = {
  default:  { border: "border-border",          icon: "bg-secondary text-secondary-foreground",  accent: "" },
  gold:     { border: "border-primary/25",       icon: "bg-primary/12 text-primary",              accent: "text-primary" },
  success:  { border: "border-success/25",       icon: "bg-success/12 text-success",              accent: "text-success" },
  info:     { border: "border-info/25",          icon: "bg-info/12 text-info",                    accent: "text-info" },
  danger:   { border: "border-destructive/25",   icon: "bg-destructive/10 text-destructive",      accent: "text-destructive" },
};

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  loading = false,
}: StatsCardProps) => {
  const s = variantStyles[variant];

  if (loading) {
    return (
      <div className={cn("rounded-xl border p-5 bg-card shadow-card animate-fade-in", s.border)}>
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton w-24 h-7 rounded mb-2" />
        <div className="skeleton w-32 h-4 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-5 bg-card shadow-card animate-slide-in",
        "hover:shadow-md hover:border-primary/20 transition-all duration-200",
        s.border
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", s.icon)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full",
              trend.positive
                ? "bg-success/12 text-success"
                : "bg-destructive/12 text-destructive"
            )}
          >
            {trend.positive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>

      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className={cn("text-[1.6rem] font-bold leading-none tracking-tight text-foreground", s.accent)}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{subtitle}</p>
      )}
    </div>
  );
};

export default StatsCard;
