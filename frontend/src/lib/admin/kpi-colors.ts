import type { KpiColor } from "./types";

/** Compact KPI: icon badge backgrounds */
export const KPI_ICON_BG: Record<KpiColor, string> = {
  green: "bg-white/20 text-white backdrop-blur-sm",
  blue: "bg-white/20 text-white backdrop-blur-sm",
  purple: "bg-white/20 text-white backdrop-blur-sm",
  teal: "bg-white/20 text-white backdrop-blur-sm",
  yellow: "bg-white/20 text-white backdrop-blur-sm",
  red: "bg-white/20 text-white backdrop-blur-sm",
  gray: "bg-white/20 text-white backdrop-blur-sm",
};

/** Compact KPI: card background gradients */
export const KPI_BG: Record<KpiColor, string> = {
  green: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-200/60",
  blue: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-200/60",
  purple: "bg-gradient-to-br from-violet-500 to-purple-700 shadow-purple-200/60",
  teal: "bg-gradient-to-br from-cyan-500 to-teal-700 shadow-cyan-200/60",
  yellow: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200/60",
  red: "bg-gradient-to-br from-rose-500 to-red-700 shadow-rose-200/60",
  gray: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-200/60",
};

export const KPI_TEXT_MUTED = "text-white/85";
export const KPI_TREND_GOOD = "text-white";
export const KPI_TREND_BAD = "text-white";
export const KPI_TREND_BADGE = "rounded-md border border-white/20 bg-white/15 px-1.5 py-0.5";
