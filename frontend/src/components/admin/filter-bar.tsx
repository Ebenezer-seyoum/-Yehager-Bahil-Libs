"use client";

import type { ReactNode } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { RecordsBadge } from "@/components/admin/records-badge";
import type { DateRangeKey } from "@/lib/reports/utils";

export function FilterBar({
  search,
  onSearchChange,
  placeholder = "Search records...",
  actions,
  onExport,
  showExport,
  recordsCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  actions?: ReactNode;
  onExport?: () => void;
  showExport?: boolean;
  recordsCount?: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-3">
        <label className="relative min-w-0 flex-1 max-w-full sm:max-w-[36rem] flex items-center gap-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {recordsCount !== undefined ? (
            <div className="ml-3 inline-flex">
              <RecordsBadge count={recordsCount} />
            </div>
          ) : null}
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showExport && onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-secondary"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        ) : null}
      </div>
    </div>
  );
}
