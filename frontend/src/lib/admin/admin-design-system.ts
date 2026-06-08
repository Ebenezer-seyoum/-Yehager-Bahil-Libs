/** Global white/blue theme for admin dashboard tabs and table headers */

/* Tabs — wrapper with visible left vertical accent */
export const ADMIN_TAB_WRAPPER =
  "relative overflow-hidden rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-100/80 via-blue-50/90 to-white p-3 shadow-[0_4px_22px_rgba(30,58,138,0.1)] ring-1 ring-blue-100";

export const ADMIN_TAB_WRAPPER_ACCENT =
  "pointer-events-none absolute inset-y-2 left-0 w-1.5 rounded-r-full bg-gradient-to-b from-blue-950 via-blue-800 to-blue-500 shadow-[2px_0_12px_rgba(30,58,138,0.35)]";

export const ADMIN_TAB_LIST =
  "relative z-[1] flex flex-wrap items-center gap-2 pl-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-0.5";

export const ADMIN_TAB_ACTION_GROUP =
  "ml-auto flex shrink-0 flex-wrap items-center gap-2 border-l-2 border-blue-300/80 pl-3 max-sm:ml-0 max-sm:border-l-0 max-sm:pl-0 max-sm:pt-2";

export const ADMIN_TAB_INACTIVE =
  "bg-white text-slate-700 border border-blue-200/90 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800";

export const ADMIN_TAB_ACTIVE =
  "bg-blue-900 text-white border-blue-900 shadow-md shadow-blue-900/35";

/** Action tabs (Add Employee / Add Customer) — always look like top CTA buttons */
export const ADMIN_TAB_ACTION =
  "bg-blue-900 text-white border-blue-900 shadow-md shadow-blue-900/30 hover:bg-blue-950 hover:border-blue-950";

export const ADMIN_TAB_ACTION_ACTIVE =
  "bg-blue-950 text-white border-blue-950 shadow-lg shadow-blue-900/40 ring-2 ring-blue-400/80 ring-offset-2 ring-offset-blue-50";

export const ADMIN_TAB_ICON_INACTIVE =
  "text-slate-500 group-hover:text-blue-700";

export const ADMIN_TAB_ICON_ACTIVE = "text-white";

export const ADMIN_TAB_ICON_ACTION = "text-white";

export const ADMIN_TAB_BUTTON_BASE =
  "group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all max-sm:shrink-0";

/* Tables */
export const ADMIN_TABLE_WRAPPER =
  "overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm";

export const TABLE_HEAD_CLASS =
  "sticky top-0 z-10 border-b border-blue-100 bg-blue-50";

export const TABLE_HEAD_ROW_CLASS = "text-left";

export const TABLE_HEAD_CELL_CLASS =
  "px-4 py-4 text-left text-sm font-bold text-blue-950";

export const TABLE_HEAD_CELL_SORTABLE_CLASS =
  "cursor-pointer transition-colors hover:bg-blue-100/70 hover:text-blue-950";

export const TABLE_HEAD_CELL_SORTED_CLASS = "bg-blue-100/70 text-blue-950";

export const ADMIN_TABLE_BODY_ROW =
  "border-b border-blue-50/80 transition hover:bg-blue-50/40";

export const ADMIN_TABLE_BODY_ROW_ALT = "bg-blue-50/20";

export const ADMIN_TABLE_BODY_CELL = "px-4 py-3 text-sm font-medium text-foreground";

export const ADMIN_TABLE_NUMBER_CELL = "w-14 px-4 py-3 text-sm font-semibold text-slate-600";

export const DASHBOARD_TABLE_ACTIONS_HEAD = "w-[12%] px-4 py-3";
export const DASHBOARD_TABLE_NUMBER_HEAD = "w-[5%] px-4 py-3";

/** @deprecated Use TABLE_HEAD_CLASS */
export const ADMIN_TABLE_HEAD_ROW = TABLE_HEAD_CLASS;

/** @deprecated Use TABLE_HEAD_CELL_CLASS */
export const ADMIN_TABLE_HEAD_CELL = TABLE_HEAD_CELL_CLASS;
