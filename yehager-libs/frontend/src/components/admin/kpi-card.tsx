"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { formatChange } from "@/lib/reports/utils";
import { KPI_BORDER, KPI_ICON_BG, KPI_TREND_BAD, KPI_TREND_GOOD } from "@/lib/admin/kpi-colors";
import type { KpiCardModel } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function KPICard({ metric, className }: { metric: KpiCardModel; className?: string }) {
  const Icon = metric.icon;
  const loading = metric.status === "loading";
  const empty = metric.status === "empty";
  const error = metric.status === "error";
  const increased = metric.changePercent >= 0;
  const good = metric.positiveIsGood ? increased : !increased;
  const showTrend = !empty && metric.changePercent !== 0;

  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border bg-white p-2.5 shadow-sm", className)}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-1.5 h-5 w-12" />
        <Skeleton className="mt-1.5 h-2.5 w-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-rose-200 bg-rose-50 p-2.5", className)}>
        <p className="text-[10px] font-semibold text-rose-700">{metric.title}</p>
        <p className="mt-0.5 text-[11px] text-rose-600">Unable to load</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border border-l-[3px] bg-white p-2.5 shadow-sm transition hover:shadow-md",
        KPI_BORDER[metric.color],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {metric.title}
          </p>
          <p className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-foreground">
            {empty ? "—" : metric.value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            KPI_ICON_BG[metric.color],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{metric.description}</p>
      {showTrend ? (
        <div
          className={cn(
            "mt-1 flex items-center gap-0.5 text-[10px] font-semibold",
            good ? KPI_TREND_GOOD : KPI_TREND_BAD,
          )}
        >
          {increased ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          <span>
            {formatChange(metric.changePercent)} {increased ? "up" : "down"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
