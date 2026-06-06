"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./loading-state";
import { TableHeadCell, TableHeadRow, TableHeader } from "./table-header";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  defaultVisible?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  isLoading,
  pageSize = 10,
  getRowKey,
  emptyTitle,
  emptyDescription,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  pageSize?: number;
  getRowKey: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleKeys, setVisibleKeys] = useState(() =>
    columns.filter((c) => c.defaultVisible !== false).map((c) => c.key),
  );
  const [showColumns, setShowColumns] = useState(false);

  const visibleColumns = columns.filter((c) => visibleKeys.includes(c.key));

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return rows;
    return [...rows].sort((a, b) => {
      const av = String(column.cell(a) ?? "");
      const bv = String(column.cell(b) ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

  if (isLoading) return <LoadingState />;

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-blue-100 bg-card shadow-sm">
      <div className="flex justify-end border-b border-blue-100 px-3 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumns((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-100 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns
          </button>
          {showColumns ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-blue-100 bg-popover p-2 shadow-lg">
              {columns.map((column) => (
                <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={visibleKeys.includes(column.key)}
                    onChange={() => {
                      setVisibleKeys((keys) =>
                        keys.includes(column.key)
                          ? keys.filter((k) => k !== column.key)
                          : [...keys, column.key],
                      );
                    }}
                  />
                  {column.header}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full w-full text-sm">
          <TableHeader>
            <TableHeadRow>
              {visibleColumns.map((column) => (
                <TableHeadCell
                  key={column.key}
                  sortable={column.sortable}
                  sorted={sortKey === column.key}
                  sortDirection={sortDir}
                  onSort={column.sortable ? () => toggleSort(column.key) : undefined}
                >
                  {column.header}
                </TableHeadCell>
              ))}
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {pageRows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  "border-b border-border transition hover:bg-blue-50/40",
                  index % 2 === 1 && "bg-blue-50/20",
                )}
              >
                {visibleColumns.map((column) => (
                  <td key={column.key} className="px-4 py-3 font-medium text-foreground">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-blue-100 px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-blue-100 p-1.5 hover:bg-blue-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 font-medium">
            {page + 1}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-blue-100 p-1.5 hover:bg-blue-50 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
