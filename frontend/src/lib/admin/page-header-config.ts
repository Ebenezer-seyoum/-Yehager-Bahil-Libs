import type { AdminPageId } from "./types";

export type PageThemeKey = "blue" | "purple" | "teal" | "orange" | "green" | "indigo" | "slate";

export const PAGE_HEADER_CONFIG: Record<
  AdminPageId,
  { theme: PageThemeKey; section: string }
> = {
  dashboard: { theme: "blue", section: "Overview" },
  employees: { theme: "purple", section: "Users" },
  customers: { theme: "purple", section: "Users" },
  roles: { theme: "purple", section: "Users" },
  products: { theme: "teal", section: "Catalog" },
  sections: { theme: "teal", section: "Catalog" },
  orders: { theme: "orange", section: "Operations" },
  payments: { theme: "green", section: "Operations" },
  documents: { theme: "orange", section: "Operations" },
  "uploaded-designs": { theme: "teal", section: "Catalog" },
  "exchange-rate": { theme: "green", section: "Operations" },
  reports: { theme: "indigo", section: "Reports" },
  "support-inbox": { theme: "slate", section: "System" },
  settings: { theme: "slate", section: "System" },
  "activity-logs": { theme: "slate", section: "System" },
  alerts: { theme: "orange", section: "Operations" },
};

export const THEME_STYLES: Record<
  PageThemeKey,
  {
    header: string;
    headerIcon: string;
    tabActive: string;
    tabInactive: string;
    tabIconActive: string;
    tabIconInactive: string;
  }
> = {
  blue: {
    header: "border-blue-200/80 bg-white border-l-[4px] border-l-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.08)]",
    headerIcon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
    tabActive: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-blue-600",
  },
  purple: {
    header: "border-violet-200/80 bg-white border-l-[4px] border-l-violet-500 shadow-[0_4px_20px_rgba(139,92,246,0.08)]",
    headerIcon: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
    tabActive: "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-violet-600",
  },
  teal: {
    header: "border-teal-200/80 bg-white border-l-[4px] border-l-teal-500 shadow-[0_4px_20px_rgba(20,184,166,0.08)]",
    headerIcon: "bg-teal-50 text-teal-600 ring-1 ring-teal-100",
    tabActive: "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-teal-600",
  },
  orange: {
    header: "border-orange-200/80 bg-white border-l-[4px] border-l-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.08)]",
    headerIcon: "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
    tabActive: "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-orange-600",
  },
  green: {
    header: "border-emerald-200/80 bg-white border-l-[4px] border-l-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.08)]",
    headerIcon: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
    tabActive: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-emerald-600",
  },
  indigo: {
    header: "border-indigo-200/80 bg-white border-l-[4px] border-l-indigo-500 shadow-[0_4px_20px_rgba(99,102,241,0.08)]",
    headerIcon: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
    tabActive: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-indigo-600",
  },
  slate: {
    header: "border-slate-200/80 bg-white border-l-[4px] border-l-slate-500 shadow-[0_4px_20px_rgba(100,116,139,0.08)]",
    headerIcon: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    tabActive: "bg-slate-700 text-white border-slate-700 shadow-md shadow-slate-300/60",
    tabInactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800",
    tabIconActive: "text-white",
    tabIconInactive: "text-slate-500 group-hover:text-slate-700",
  },
};

/** Per-tab accent overrides (payments, etc.) */
export const TAB_ACCENT_STYLES: Record<
  string,
  { active: string; inactive: string; iconActive: string; iconInactive: string }
> = {
  blue: {
    active: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  green: {
    active: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  yellow: {
    active: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  red: {
    active: "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  purple: {
    active: "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  teal: {
    active: "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  orange: {
    active: "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:border-orange-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  indigo: {
    active: "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
  gray: {
    active: "bg-slate-600 text-white border-slate-600 shadow-md shadow-slate-200/60",
    inactive: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
    iconActive: "text-white",
    iconInactive: "text-slate-500",
  },
};

export function getPageTheme(pageId: AdminPageId) {
  return PAGE_HEADER_CONFIG[pageId]?.theme ?? "blue";
}
