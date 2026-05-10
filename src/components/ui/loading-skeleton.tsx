import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("skeleton", className)} />
);

export const StatsGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-3 md:gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border p-5 bg-card shadow-card space-y-4">
        <div className="flex items-start justify-between">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-14 h-5 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-20 h-4 rounded" />
          <Skeleton className="w-28 h-7 rounded" />
          <Skeleton className="w-24 h-3 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-4 px-4 pb-2 border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 rounded flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/50">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton
            key={j}
            className={cn("h-4 rounded", j === 0 ? "w-20" : "flex-1")}
          />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ className }: SkeletonProps) => (
  <div className={cn("rounded-xl border border-border p-5 bg-card shadow-card space-y-3", className)}>
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="w-32 h-4 rounded" />
    </div>
    <Skeleton className="w-full h-3 rounded" />
    <Skeleton className="w-4/5 h-3 rounded" />
  </div>
);
