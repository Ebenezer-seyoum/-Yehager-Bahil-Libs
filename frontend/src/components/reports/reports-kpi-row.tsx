"use client";

import { KPIGrid } from "@/components/admin/kpi-grid";
import type { KpiCardModel, KpiColor } from "@/lib/admin/types";
import type { MetricCardData } from "@/lib/reports/report-metrics";

const colorMap: Record<string, KpiColor> = {
  blue: "blue",
  green: "green",
  purple: "purple",
  orange: "yellow",
  rose: "red",
  cyan: "blue",
  emerald: "green",
  violet: "purple",
};

function toKpiModel(metric: MetricCardData): KpiCardModel {
  return {
    id: metric.title,
    title: metric.title,
    value: metric.value,
    description: "Compared to previous period",
    changePercent: metric.changeValue,
    positiveIsGood: metric.positiveIsGood,
    color: colorMap[metric.color] ?? "blue",
    icon: metric.icon,
    status: "ready",
  };
}

export function ReportsKpiRow({
  metrics,
  comparisonLabel = "vs previous period",
}: {
  metrics: MetricCardData[];
  comparisonLabel?: string;
}) {
  const models = metrics.map((metric) => ({
    ...toKpiModel(metric),
    description: comparisonLabel,
  }));

  return <KPIGrid metrics={models} />;
}
