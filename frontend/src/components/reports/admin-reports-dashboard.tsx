"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Grid2X2, List, Search } from "lucide-react";
import { ReportsCategorySidebar, firstReportInCategory } from "@/components/reports/reports-category-sidebar";
import { ReportsFilterPanel } from "@/components/reports/reports-filter-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ReportsKpiRow } from "@/components/reports/reports-kpi-row";
import { ReportsReportCardGrid } from "@/components/reports/reports-report-card-grid";
import { ReportsResults, type ResultsTab } from "@/components/reports/reports-results";
import { ReportsSectionHeader } from "@/components/reports/reports-section-header";
import { fetchReportsPayload } from "@/lib/reports/report-api";
import {
  applyCustomerFilters,
  buildSelectOptions,
  defaultFiltersForFamily,
  FILTER_FIELDS_BY_FAMILY,
  type FilterValues,
} from "@/lib/reports/report-filters";
import {
  filterOrdersForReport,
  getRowsForReport,
  type ReportsPayload,
} from "@/lib/reports/report-data";
import { calculateGlobalMetrics } from "@/lib/reports/report-metrics";
import {
  categories,
  firstReportInCategory as defaultFirstReport,
  getReport,
  reportsForCategory,
  type ReportCategoryKey,
  type ReportKey,
} from "@/lib/reports/report-registry";
import { getOrderCountry, rowsInDateRange, type DateRangeKey } from "@/lib/reports/utils";

type CardViewMode = "grid" | "list";

function parseCategory(value: string | null): ReportCategoryKey {
  const found = categories.find((c) => c.key === value);
  return found?.key ?? "overview";
}

function parseReportKey(value: string | null, category: ReportCategoryKey): ReportKey {
  const match = reportsForCategory(category).find((r) => r.key === value);
  if (match) return match.key;
  return defaultFirstReport(category) as ReportKey;
}

function SearchControls({
  value,
  onChange,
  viewMode,
  onViewModeChange,
}: {
  value: string;
  onChange: (value: string) => void;
  viewMode: CardViewMode;
  onViewModeChange: (mode: CardViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative hidden sm:block">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="Search reports..."
        />
        <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
      </div>
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm ${
          viewMode === "grid"
            ? "border-blue-200 bg-blue-50 text-blue-600"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <Grid2X2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm ${
          viewMode === "list"
            ? "border-blue-200 bg-blue-50 text-blue-600"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminReportsDashboard({
  reports: initialReports,
  initialCategory = "overview",
  initialReport,
}: {
  reports: ReportsPayload;
  initialCategory?: ReportCategoryKey;
  initialReport?: ReportKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams()!;

  const urlCategory = parseCategory(searchParams.get("category") ?? initialCategory);
  const urlReport = parseReportKey(
    searchParams.get("report") ?? initialReport ?? null,
    urlCategory,
  );

  const [reportsPayload, setReportsPayload] = useState<ReportsPayload>(initialReports);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryKey>(urlCategory);
  const [selectedReport, setSelectedReport] = useState<ReportKey>(urlReport);
  const [activeTab, setActiveTab] = useState<ResultsTab>("Data Table");
  const [search, setSearch] = useState("");
  const [cardViewMode, setCardViewMode] = useState<CardViewMode>("grid");
  const [reportSectionCollapsed, setReportSectionCollapsed] = useState(false);
  const [filterSectionCollapsed, setFilterSectionCollapsed] = useState(false);
  const [globalDateRange, setGlobalDateRange] = useState<DateRangeKey>("Last 30 Days");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const currentReportDef = getReport(selectedReport);
  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...defaultFiltersForFamily(currentReportDef.filterFamily),
    dateRange: globalDateRange,
  }));

  const orders = useMemo(() => {
    const rows = reportsPayload.orders?.rows ?? [];
    return rowsInDateRange(rows, globalDateRange);
  }, [reportsPayload.orders?.rows, globalDateRange]);

  const syncUrl = useCallback(
    (category: ReportCategoryKey, report: ReportKey) => {
      const params = new URLSearchParams();
      params.set("category", category);
      params.set("report", report);
      router.replace(`/admin/reports?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const refreshFromBackend = useCallback(async (activeFilters: FilterValues) => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const payload = await fetchReportsPayload({
        category: selectedCategory,
        report: selectedReport,
        filters: activeFilters,
      });
      setReportsPayload(payload);
      setGeneratedAt(new Date());
      setHasGenerated(true);
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : "Failed to refresh report data",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedReport]);

  useEffect(() => {
    setSelectedCategory(urlCategory);
    setSelectedReport(urlReport);
  }, [urlCategory, urlReport]);

  useEffect(() => {
    setFilters({
      ...defaultFiltersForFamily(currentReportDef.filterFamily),
      dateRange: globalDateRange,
    });
  }, [selectedReport, currentReportDef.filterFamily]);

  useEffect(() => {
    if (!FILTER_FIELDS_BY_FAMILY[currentReportDef.filterFamily].includes("dateRange")) {
      return;
    }
    setFilters((prev) => ({ ...prev, dateRange: globalDateRange }));
  }, [globalDateRange, currentReportDef.filterFamily]);

  const { metrics, comparisonLabel } = useMemo(
    () => calculateGlobalMetrics(orders, globalDateRange),
    [orders, globalDateRange],
  );

  const filteredOrders = useMemo(
    () => filterOrdersForReport(reportsPayload.orders?.rows ?? [], filters),
    [reportsPayload.orders?.rows, filters],
  );

  const customerRows = useMemo(() => {
    const rows = reportsPayload.customers?.rows ?? [];
    return applyCustomerFilters(rows, filters);
  }, [reportsPayload.customers?.rows, filters]);

  const reportRows = useMemo(() => {
    if (!hasGenerated) return [];

    const payloadWithCustomers = {
      ...reportsPayload,
      customers: { rows: customerRows },
    };
    return getRowsForReport(
      selectedReport,
      payloadWithCustomers,
      filteredOrders,
      filters,
    ).slice(0, 200);
  }, [
    hasGenerated,
    selectedReport,
    reportsPayload,
    filteredOrders,
    filters,
    customerRows,
  ]);

  const optionLists = useMemo(() => {
    const allOrders = reportsPayload.orders?.rows ?? [];
    const products = reportsPayload.products?.rows ?? [];
    const supportRows = reportsPayload.support?.rows ?? [];
    return {
      status: buildSelectOptions(allOrders, "status", "All Status"),
      paymentMethod: [
        "All Methods",
        ...Array.from(
          new Set(
            allOrders
              .map((row) => row.paymentMethod ?? row.paymentStatus)
              .filter(Boolean)
              .map(String),
          ),
        ),
      ],
      productCategory: buildSelectOptions(products, "category", "All Categories"),
      ticketStatus: [
        "All Status",
        ...Array.from(new Set(supportRows.map((row) => row.status ?? row.alertStatus).filter(Boolean).map(String))),
      ],
      priority: [
        "All Priority",
        ...Array.from(new Set(supportRows.map((row) => row.priority ?? row.severity).filter(Boolean).map(String))),
      ],
      refundStatus: ["All Refunds", "Refunded", "Not refunded"],
      stockLevel: ["All Stock", "Low Stock", "In Stock"],
      country: [
        "All Countries",
        ...Array.from(
          new Set(allOrders.map((row) => getOrderCountry(row)).filter(Boolean)),
        ),
      ],
      city: [
        "All Cities",
        ...Array.from(
          new Set(
            allOrders
              .map((row) => {
                const shippingAddress = row.shippingAddress as Record<string, unknown> | undefined;
                return String(row.city ?? shippingAddress?.city ?? shippingAddress?.town ?? "");
              })
              .filter(Boolean),
          ),
        ),
      ],
      employee: buildSelectOptions(allOrders, "employeeName", "All Employees"),
      deliveryStatus: [
        "All Status",
        ...Array.from(
          new Set(
            allOrders
              .map((row) => row.deliveryStatus ?? row.shippingStatus ?? row.status)
              .filter(Boolean)
              .map(String),
          ),
        ),
      ],
      driver: [
        "All Drivers",
        ...Array.from(
          new Set(
            allOrders
              .map((row) => row.deliveryDriver ?? row.driverName ?? row.assignedDriver)
              .filter(Boolean)
              .map(String),
          ),
        ),
      ],
      category: buildSelectOptions(products, "category", "All Categories"),
    };
  }, [reportsPayload.orders?.rows, reportsPayload.products?.rows, reportsPayload.support?.rows]);

  const filteredReportCards = reportsForCategory(selectedCategory, search);
  const currentReport = getReport(selectedReport);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "dateRange") {
        setGlobalDateRange(value as DateRangeKey);
      }
      return next;
    });
    setHasGenerated(false);
  }

  function clearFilters() {
    setFilters({
      ...defaultFiltersForFamily(currentReportDef.filterFamily),
      dateRange: globalDateRange,
    });
    setHasGenerated(false);
  }

  function handleSelectCategory(category: ReportCategoryKey) {
    const report = firstReportInCategory(category) as ReportKey;
    setSelectedCategory(category);
    setSelectedReport(report);
    syncUrl(category, report);
    setHasGenerated(false);
  }

  function handleSelectReport(category: ReportCategoryKey, report: ReportKey) {
    setSelectedCategory(category);
    setSelectedReport(report);
    syncUrl(category, report);
    setHasGenerated(false);
  }

  async function handleGenerateReport() {
    await refreshFromBackend(filters);
    setActiveTab("Data Table");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6 xl:px-8">
        {fetchError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {fetchError}
          </div>
        ) : null}

        <AdminPageHeader
          pageId="reports"
          showDateRange
          dateRange={globalDateRange}
          onDateRangeChange={(value) => setGlobalDateRange(value)}
          onRefresh={() => refreshFromBackend(filters)}
          isRefreshing={isRefreshing}
          showExport
          onExport={() => {
            void refreshFromBackend(filters);
          }}
        />

        <ReportsKpiRow metrics={metrics} comparisonLabel={comparisonLabel} />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ReportsSectionHeader
            step="1"
            title="Choose Report Category & Report"
            subtitle={`Selected: ${currentReport.title}`}
            right={
              <SearchControls
                value={search}
                onChange={setSearch}
                viewMode={cardViewMode}
                onViewModeChange={setCardViewMode}
              />
            }
            collapsed={reportSectionCollapsed}
            onToggle={() => setReportSectionCollapsed((prev) => !prev)}
          />

          {!reportSectionCollapsed ? (
            <div className="grid lg:grid-cols-[320px_1fr]">
              <ReportsCategorySidebar
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />

              <div className="border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
                <h3 className="mb-4 text-[14px] font-extrabold text-slate-800">
                  Select Specific Report
                </h3>
                <ReportsReportCardGrid
                  reports={filteredReportCards}
                  selectedReport={selectedReport}
                  viewMode={cardViewMode}
                  onSelect={handleSelectReport}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ReportsSectionHeader
            step="2"
            title="Apply Filters"
            subtitle="Refine your data with advanced filters"
            collapsed={filterSectionCollapsed}
            onToggle={() => setFilterSectionCollapsed((prev) => !prev)}
          />
          {!filterSectionCollapsed ? (
            <ReportsFilterPanel
              family={currentReportDef.filterFamily}
              filters={filters}
              optionLists={optionLists}
              onChange={updateFilter}
              onClear={clearFilters}
            />
          ) : null}
        </section>

        <ReportsResults
          reportKey={selectedReport}
          reportTitle={currentReport.title}
          dataSource={currentReportDef.dataSource}
          rows={reportRows}
          filters={filters}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          rowCount={reportRows.length}
          generatedAt={generatedAt}
          hasGenerated={hasGenerated}
          onGenerate={handleGenerateReport}
          isLoading={isRefreshing}
        />
      </div>
    </main>
  );
}
