"use client";

import type { KpiCardModel } from "@/lib/admin/types";
import { KPICard } from "./kpi-card";

export function KPIGrid({ metrics, maxVisible }: { metrics: KpiCardModel[]; maxVisible?: number }) {
  if (!metrics.length) return null;
  const visible = maxVisible ? metrics.slice(0, maxVisible) : metrics;

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {visible.map((metric) => (
        <KPICard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
