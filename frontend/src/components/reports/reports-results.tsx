"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Eye, LayoutDashboard, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportKey } from "@/lib/reports/report-registry";
import {
  buildOrderExportUrl,
  canUseOrderApiExport,
  downloadTableCsv,
  downloadTablePdf,
  downloadTableXlsx,
  slugifyReportName,
} from "@/lib/reports/report-export";
import type { FilterValues } from "@/lib/reports/report-filters";
import {
  buildChartData,
  buildInsights,
  buildSummary,
  buildTableView,
} from "@/lib/reports/report-views";
import {
  ADMIN_TAB_ACTIVE,
  ADMIN_TAB_BUTTON_BASE,
  ADMIN_TAB_INACTIVE,
  ADMIN_TAB_LIST,
  ADMIN_TAB_WRAPPER,
  ADMIN_TAB_WRAPPER_ACCENT,
} from "@/lib/admin/admin-design-system";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { cn } from "@/lib/utils";
import { money } from "@/lib/reports/utils";

const TABS = ["Data Table", "Charts", "Summary", "Insights"] as const;
export type ResultsTab = (typeof TABS)[number];

function columnStorageKey(reportKey: ReportKey) {
  return `reports-columns-${reportKey}`;
}

function DataTable({
  columns,
  rows,
  visibleColumns,
}: {
  columns: string[];
  rows: (string | number)[][];
  visibleColumns: Set<string>;
}) {
  const displayColumns = columns.filter((column) => visibleColumns.has(column));

  if (!displayColumns.length) {
    return (
      <div className="rounded-b-2xl border-t border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
        Enable at least one column to view the table.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-b-2xl border-t border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
        No report rows found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <TableHeader>
          <TableHeadRow>
            {displayColumns.map((column) => (
              <TableHeadCell key={column}>{column}</TableHeadCell>
            ))}
          </TableHeadRow>
        </TableHeader>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50">
              {displayColumns.map((column) => {
                const cellIndex = columns.indexOf(column);
                const cell = row[cellIndex];
                return (
                  <td
                    key={`${rowIndex}-${column}`}
                    className={`px-6 py-4 ${
                      cellIndex === 0
                        ? "font-bold text-slate-900"
                        : "capitalize text-slate-700"
                    }`}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnVisibilityMenu({
  columns,
  visibleColumns,
  onToggle,
}: {
  columns: string[];
  visibleColumns: Set<string>;
  onToggle: (column: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Eye className="h-4.5 w-4.5" />
        Column Visibility
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Show columns
          </p>
          <ul className="space-y-1">
            {columns.map((column) => (
              <li key={column}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(column)}
                    onChange={() => onToggle(column)}
                    className="rounded border-slate-300"
                  />
                  {column}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AwaitingGeneratePanel() {
  return (
    <div className="rounded-b-2xl border-t border-slate-200 bg-white px-6 py-20 text-center">
      <LayoutDashboard className="mx-auto h-12 w-12 text-slate-300" />
      <h3 className="mt-4 text-lg font-extrabold text-slate-900">Ready to generate</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Choose a report, apply your filters, then click Generate Report to load data from the
        server.
      </p>
    </div>
  );
}

export function ReportsResults({
  reportKey,
  reportTitle,
  dataSource,
  rows,
  filters,
  activeTab,
  onTabChange,
  rowCount,
  generatedAt,
  hasGenerated,
  onGenerate,
  isLoading,
  canExport = true,
}: {
  reportKey: ReportKey;
  reportTitle: string;
  dataSource: "orders" | "products" | "customers" | "support";
  rows: Record<string, unknown>[];
  filters: FilterValues;
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
  rowCount: number;
  generatedAt: Date | null;
  hasGenerated: boolean;
  onGenerate: () => void | Promise<void>;
  isLoading?: boolean;
  canExport?: boolean;
}) {
  const table = buildTableView(reportKey, rows);
  const chartData = buildChartData(reportKey, rows);
  const summary = buildSummary(reportKey, rows);
  const insights = buildInsights(reportKey, rows);
  const sectionRef = useRef<HTMLElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set());
  const [tableSearch, setTableSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(columnStorageKey(reportKey))
        : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setVisibleColumns(new Set(parsed));
        return;
      } catch {
        // ignore invalid storage
      }
    }

    setVisibleColumns(new Set(table.columns));
  }, [reportKey, table.columns.join("|")]);

  useEffect(() => {
    setTableSearch("");
    setSortColumn("");
    setSortDirection("desc");
    setPage(1);
  }, [reportKey]);

  useEffect(() => {
    if (!visibleColumns.size || typeof window === "undefined") return;
    window.localStorage.setItem(
      columnStorageKey(reportKey),
      JSON.stringify([...visibleColumns]),
    );
  }, [visibleColumns, reportKey]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredRows = useMemo(() => {
    const searchNeedle = tableSearch.trim().toLowerCase();
    const visibleIndices = table.columns
      .map((column, index) => (visibleColumns.has(column) ? index : -1))
      .filter((index) => index >= 0);

    const searched = !searchNeedle
      ? table.rows
      : table.rows.filter((row) =>
          visibleIndices.some((index) => String(row[index] ?? "").toLowerCase().includes(searchNeedle)),
        );

    if (!sortColumn) {
      return searched;
    }

    const sortIndex = table.columns.indexOf(sortColumn);
    if (sortIndex < 0) return searched;

    return [...searched].sort((left, right) => {
      const leftValue = String(left[sortIndex] ?? "");
      const rightValue = String(right[sortIndex] ?? "");
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [table.rows, table.columns, tableSearch, visibleColumns, sortColumn, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [tableSearch, sortColumn, sortDirection, pageSize, reportKey]);

  const exportColumns = table.columns.filter((column) => visibleColumns.has(column));
  const exportRows = filteredRows.map((row) =>
    exportColumns.map((column) => {
      const index = table.columns.indexOf(column);
      return row[index];
    }),
  );

  function toggleColumn(column: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        if (next.size > 1) next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }

  function handleClientExport() {
    downloadTableCsv(
      `${slugifyReportName(reportTitle)}-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns.length ? exportColumns : table.columns,
      exportColumns.length ? exportRows : table.rows,
    );
  }

  function handleExcelExport() {
    downloadTableXlsx(
      `${slugifyReportName(reportTitle)}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      exportColumns.length ? exportColumns : table.columns,
      exportColumns.length ? exportRows : table.rows,
    );
  }

  function handlePdfExport() {
    downloadTablePdf(
      `${slugifyReportName(reportTitle)}-${new Date().toISOString().slice(0, 10)}.pdf`,
      reportTitle,
      exportColumns.length ? exportColumns : table.columns,
      exportColumns.length ? exportRows : table.rows,
    );
  }

  function handleExportPage() {
    downloadTableCsv(
      `${slugifyReportName(reportTitle)}-page-${currentPage}-${new Date().toISOString().slice(0, 10)}.csv`,
      exportColumns.length ? exportColumns : table.columns,
      pageRows.map((row) =>
        (exportColumns.length ? exportColumns : table.columns).map((column) => {
          const index = table.columns.indexOf(column);
          return row[index];
        }),
      ),
    );
  }

  async function handleGenerate() {
    await onGenerate();
    onTabChange("Data Table");
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const orderExportHref = canUseOrderApiExport(dataSource)
    ? buildOrderExportUrl(filters)
    : null;

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]"
    >
      <div className="px-6 pt-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
              3
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-slate-900">Report Results</h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                View data based on selected report and filters
                {hasGenerated
                  ? ` — ${rowCount} rows for ${reportTitle}${
                      generatedAt
                        ? ` · ${generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : ""
                    }`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {table.columns.length ? (
              <ColumnVisibilityMenu
                columns={table.columns}
                visibleColumns={visibleColumns}
                onToggle={toggleColumn}
              />
            ) : null}

            {canExport ? (
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((current) => !current)}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-4.5 w-4.5" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </button>
                {exportMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-2 min-w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                    <button
                      type="button"
                      onClick={handleClientExport}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Current filtered CSV
                      <span className="text-xs text-slate-400">CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExcelExport}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Current filtered Excel
                      <span className="text-xs text-slate-400">XLSX</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePdfExport}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Current filtered PDF
                      <span className="text-xs text-slate-400">PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPage}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Current page CSV
                      <span className="text-xs text-slate-400">CSV</span>
                    </button>
                    {orderExportHref ? (
                      <a
                        href={orderExportHref}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        API export for orders
                        <span className="text-xs text-slate-400">API</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:opacity-95 disabled:opacity-60"
            >
              <Download className="h-4.5 w-4.5" />
              {isLoading ? "Generating…" : "Generate Report"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className={ADMIN_TAB_WRAPPER}>
            <span className={ADMIN_TAB_WRAPPER_ACCENT} aria-hidden />
            <div className={ADMIN_TAB_LIST}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    ADMIN_TAB_BUTTON_BASE,
                    activeTab === tab ? ADMIN_TAB_ACTIVE : ADMIN_TAB_INACTIVE,
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasGenerated && activeTab === "Data Table" ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="relative min-w-0 flex-1">
              <span className="mb-2 block text-[12px] font-semibold text-slate-500">Search table</span>
              <input
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Search current report rows"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <Search className="absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <label>
                <span className="mb-2 block text-[12px] font-semibold text-slate-500">Sort by</span>
                <select
                  value={sortColumn}
                  onChange={(event) => setSortColumn(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">None</option>
                  {table.columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </button>

              <label>
                <span className="mb-2 block text-[12px] font-semibold text-slate-500">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {!hasGenerated ? (
        <AwaitingGeneratePanel />
      ) : null}

      {hasGenerated && activeTab === "Data Table" ? (
        <div>
          {isLoading ? (
            <div className="border-t border-slate-200 bg-blue-50/50 px-6 py-3 text-sm text-blue-700">
              Refreshing the selected report from the database...
            </div>
          ) : null}
          <DataTable columns={table.columns} rows={pageRows} visibleColumns={visibleColumns} />
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredRows.length, currentPage * pageSize)} of {filteredRows.length} rows
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-slate-600">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={currentPage >= pageCount}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hasGenerated && activeTab === "Charts" ? (
        <div className="px-6 py-6">
          {chartData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [
                      typeof value === "number" && value > 100 ? money(value) : value,
                      "Value",
                    ]}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel title="Charts" reportTitle={reportTitle} />
          )}
        </div>
      ) : null}

      {hasGenerated && activeTab === "Summary" ? (
        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {hasGenerated && activeTab === "Insights" ? (
        <ul className="space-y-3 px-6 py-6">
          {insights.map((line, index) => (
            <li
              key={index}
              className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-slate-700"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function EmptyPanel({ title, reportTitle }: { title: string; reportTitle: string }) {
  return (
    <div className="py-16 text-center">
      <LayoutDashboard className="mx-auto h-10 w-10 text-slate-300" />
      <h3 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">No chart data for {reportTitle}.</p>
    </div>
  );
}
