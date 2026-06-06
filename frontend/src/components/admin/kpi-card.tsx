"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { formatChange } from "@/lib/reports/utils";
import { KPI_BG, KPI_ICON_BG, KPI_TEXT_MUTED, KPI_TREND_BAD, KPI_TREND_BADGE, KPI_TREND_GOOD } from "@/lib/admin/kpi-colors";
import type { KpiCardModel } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function KPICard({ metric, className }: { metric: KpiCardModel; className?: string }) {
  const Icon = metric.icon;
  const loading = metric.status === "loading";
  const empty = metric.status === "empty";
  const error = metric.status === "error";
  const safeChange = Number.isFinite(metric.changePercent) ? metric.changePercent : 0;
  const increased = safeChange >= 0;
  const good = metric.positiveIsGood ? increased : !increased;
  const showTrend = !empty && Number.isFinite(metric.changePercent) && safeChange !== 0;

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-white p-4 shadow-sm", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-7 w-16" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-2xl border border-rose-200 bg-rose-50 p-4", className)}>
        <p className="text-xs font-semibold text-rose-700">{metric.title}</p>
        <p className="mt-1 text-sm text-rose-600">Unable to load</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        KPI_BG[metric.color],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-xs font-semibold uppercase tracking-[0.16em]", KPI_TEXT_MUTED)}>
            {metric.title}
          </p>
          <p className="mt-1 text-2xl font-black leading-tight tracking-tight text-white">
            {empty ? "—" : metric.value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/20",
            KPI_ICON_BG[metric.color],
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <p className={cn("mt-2 line-clamp-2 text-xs leading-5", KPI_TEXT_MUTED)}>{metric.description}</p>
      {showTrend ? (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            KPI_TREND_BADGE,
            good ? KPI_TREND_GOOD : KPI_TREND_BAD,
          )}
        >
          {increased ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>
            {formatChange(safeChange)} {increased ? "up" : "down"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
