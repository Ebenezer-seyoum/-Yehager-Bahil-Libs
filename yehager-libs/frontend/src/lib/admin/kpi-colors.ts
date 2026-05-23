import type { KpiColor } from "./types";

/** Compact KPI: icon badge backgrounds */
export const KPI_ICON_BG: Record<KpiColor, string> = {
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-rose-100 text-rose-700",
  purple: "bg-violet-100 text-violet-700",
  gray: "bg-slate-100 text-slate-600",
};

export const KPI_BORDER: Record<KpiColor, string> = {
  green: "border-l-emerald-500",
  blue: "border-l-blue-500",
  yellow: "border-l-amber-500",
  red: "border-l-rose-500",
  purple: "border-l-violet-500",
  gray: "border-l-slate-400",
};

export const KPI_TREND_GOOD = "text-emerald-600";
export const KPI_TREND_BAD = "text-rose-600";
