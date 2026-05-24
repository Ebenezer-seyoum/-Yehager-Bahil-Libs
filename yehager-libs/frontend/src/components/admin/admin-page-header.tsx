"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { getPageMeta } from "@/lib/admin/page-tabs-config";
import { getPageTheme, PAGE_HEADER_CONFIG, THEME_STYLES } from "@/lib/admin/page-header-config";
import type { AdminPageId } from "@/lib/admin/types";
import type { DateRangeKey } from "@/lib/reports/utils";
import { cn } from "@/lib/utils";
import { ExportButton } from "./export-button";

const DATE_RANGES: DateRangeKey[] = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month", "This Year"];

export function AdminPageHeader({
  pageId,
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  showExport,
  onExport,
  dateRange,
  onDateRangeChange,
  showDateRange,
  primaryAction,
  notice,
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
}) {
  const meta = getPageMeta(pageId);
  const headerCfg = PAGE_HEADER_CONFIG[pageId];
  const theme = getPageTheme(pageId);
  const themeStyle = THEME_STYLES[theme];
  const Icon = meta.icon;
  const heading = title ?? meta.title;
  const description = subtitle ?? meta.subtitle;
  const section = headerCfg?.section ?? meta.section;

  return (
    <header
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        themeStyle.header,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12",
              themeStyle.headerIcon,
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {section}
            </p>
            <h1 className="mt-0.5 truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {heading}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            {notice ? (
              <p className="mt-2 inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                {notice}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {showDateRange && onDateRangeChange ? (
            <select
              value={dateRange ?? "Last 30 Days"}
              onChange={(event) => onDateRangeChange(event.target.value as DateRangeKey)}
              aria-label="Date range"
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {DATE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          ) : null}
          {primaryAction}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium shadow-sm transition hover:bg-secondary disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          ) : null}
          {showExport && onExport ? <ExportButton onClick={onExport} label="Export" /> : null}
        </div>
      </div>
    </header>
  );
}
