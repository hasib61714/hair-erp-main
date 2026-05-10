import { cn } from "@/lib/utils";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 gap-2" : "py-16 gap-3",
      className
    )}
  >
    <div className={cn(
      "rounded-xl bg-muted flex items-center justify-center",
      compact ? "w-10 h-10" : "w-14 h-14"
    )}>
      <Icon className={cn("text-muted-foreground", compact ? "w-5 h-5" : "w-6 h-6")} />
    </div>
    <div>
      <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);

export default EmptyState;
