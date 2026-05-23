"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { MetricCardData } from "@/lib/reports/report-metrics";
import { formatChange } from "@/lib/reports/report-metrics";
import { metricStyle } from "@/lib/reports/report-registry";

export function ReportsKpiRow({
  metrics,
  comparisonLabel = "vs previous period",
}: {
  metrics: MetricCardData[];
  comparisonLabel?: string;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const increased = metric.changeValue >= 0;
        const good = metric.positiveIsGood ? increased : !increased;

        return (
          <div
            key={metric.title}
            className="flex min-h-[98px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${metricStyle[metric.color]} text-white shadow-lg shadow-slate-200`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-slate-700">{metric.title}</div>
              <div className="mt-1 text-[22px] font-extrabold leading-none tracking-tight text-slate-950">
                {metric.value}
              </div>
              <div
                className={`mt-2 flex items-center gap-1 text-[12px] font-medium ${
                  good ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {increased ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {formatChange(metric.changeValue)}{" "}
                  {increased ? "increase" : "decrease"} {comparisonLabel}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
