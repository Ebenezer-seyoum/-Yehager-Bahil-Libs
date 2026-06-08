"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { getPageMeta } from "@/lib/admin/page-tabs-config";
import { getPageTheme, PAGE_HEADER_CONFIG, THEME_STYLES } from "@/lib/admin/page-header-config";
import type { AdminPageId } from "@/lib/admin/types";
import type { DateRangeKey } from "@/lib/reports/utils";
import { cn } from "@/lib/utils";
import { ExportButton } from "./export-button";

export function AdminPageHeader({
  pageId,
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  showExport,
  onExport,
  primaryAction,
  notice,
  icon,
}: {
  pageId: AdminPageId;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  dateRange?: DateRangeKey;
  onDateRangeChange?: (value: DateRangeKey) => void;
  showDateRange?: boolean;
  primaryAction?: ReactNode;
  notice?: string;
  icon?: any;
}) {
  const meta = getPageMeta(pageId);
  const headerCfg = PAGE_HEADER_CONFIG[pageId];
  const theme = getPageTheme(pageId);
  const themeStyle = THEME_STYLES[theme];
  const Icon = icon ?? meta.icon;
  const heading = title ?? meta.title;
  const description = subtitle ?? meta.subtitle;
  const section = headerCfg?.section ?? meta.section;

  return (
    <header
      className={cn(
        "rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl relative overflow-hidden ring-1 ring-black/[0.02] border-l-4",
        themeStyle.header,
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 min-w-0 gap-6 items-center">
          <div
            className={cn(
              "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-sm",
              themeStyle.headerIcon,
            )}
          >
            <Icon className="h-10 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-1">
              {section}
            </p>
            <h1 className="truncate font-black text-4xl tracking-tight text-slate-900 uppercase">
              {heading}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">{description}</p>
            {notice ? (
              <p className="mt-2 inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200 uppercase tracking-tighter">
                {notice}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0 items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {primaryAction}
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 group"
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500", isRefreshing && "animate-spin")} />
                Refresh
              </button>
            ) : null}
            {showExport && onExport ? <ExportButton onClick={onExport} label="Export" /> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
