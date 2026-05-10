import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

const PageHeader = ({ title, description, icon: Icon, children, className }: PageHeaderProps) => (
  <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
    {children && (
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    )}
  </div>
);

export default PageHeader;
