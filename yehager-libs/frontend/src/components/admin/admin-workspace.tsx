"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { computePageKpis } from "@/lib/admin/kpi-compute";
import { getPageMeta } from "@/lib/admin/page-tabs-config";
import { filterPlaceholderFor } from "@/lib/admin/filter-config";
import { applyTabQuery } from "@/lib/admin/tab-query-config";
import type { AdminPageId, AdminWorkspaceData } from "@/lib/admin/types";
import type { DateRangeKey } from "@/lib/reports/utils";
import { rowsInDateRange } from "@/lib/reports/utils";
import { AdminPageHeader } from "./admin-page-header";
import { AdminTabs } from "./admin-tabs";
import { FilterBar } from "./filter-bar";
import { KPIGrid } from "./kpi-grid";

export function AdminWorkspace({
  pageId,
  initialData,
  children,
  hideTabs,
  hideFilters,
  hideFiltersOnTabs,
  hideKpisOnTabs,
  showExport,
  onExport,
  showDateRange,
  primaryAction,
  headerNotice,
  filterPlaceholder,
  maxWidth = "max-w-screen-2xl",
  footer,
}: {
  pageId: AdminPageId;
  initialData: AdminWorkspaceData;
  children: (ctx: {
    activeTab: string;
    filteredData: AdminWorkspaceData;
    search: string;
    dateRange: DateRangeKey;
  }) => ReactNode;
  hideTabs?: boolean;
  hideFilters?: boolean;
  /** Hide filter bar when one of these tab ids is active */
  hideFiltersOnTabs?: string[];
  /** Hide KPI row when one of these tab ids is active */
  hideKpisOnTabs?: string[];
  showExport?: boolean;
  onExport?: () => void;
  showDateRange?: boolean;
  primaryAction?: ReactNode;
  headerNotice?: string;
  filterPlaceholder?: string;
  maxWidth?: string;
  /** Charts / insights only — never duplicate KPI cards */
  footer?: ReactNode;
}) {
  const meta = getPageMeta(pageId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRefreshing, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeKey>("Last 30 Days");

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const activeTab = searchParams.get("tab") ?? meta.defaultTab;

  const setActiveTab = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const dateFilteredData = useMemo(() => {
    const orders = data.orders ?? [];
    if (!showDateRange || !orders.length) return data;
    return { ...data, orders: rowsInDateRange(orders, dateRange) };
  }, [data, dateRange, showDateRange]);

  const tabFilteredData = useMemo(
    () => applyTabQuery(pageId, activeTab, dateFilteredData),
    [pageId, activeTab, dateFilteredData],
  );

  const kpis = useMemo(() => computePageKpis(pageId, tabFilteredData), [pageId, tabFilteredData]);
  const showKpis = !hideKpisOnTabs?.includes(activeTab);
  const showFilters = !hideFilters && !hideFiltersOnTabs?.includes(activeTab);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setData(initialData);
    });
  }, [initialData, router]);

  return (
    <div className={`mx-auto w-full ${maxWidth} space-y-4 pb-8`}>
      {/* 1. Page Header */}
      <AdminPageHeader
        pageId={pageId}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        showExport={showExport}
        onExport={onExport}
        showDateRange={showDateRange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        primaryAction={primaryAction}
        notice={headerNotice}
      />

      {/* 2. Compact KPI cards — top only */}
      {showKpis ? <KPIGrid metrics={kpis} /> : null}

      {/* 3. Tabs */}
      {!hideTabs ? (
        <AdminTabs tabs={meta.tabs} activeTab={activeTab} onChange={setActiveTab} />
      ) : null}

      {/* 4. Filters / search / actions */}
      {showFilters ? (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder={filterPlaceholder ?? filterPlaceholderFor(pageId)}
          showExport={showExport}
          onExport={onExport}
        />
      ) : null}

      {/* 5. Main content (tables) */}
      <div className="min-w-0">{children({ activeTab, filteredData: tabFilteredData, search, dateRange })}</div>

      {/* 6. Optional charts / insights */}
      {footer ? <div className="min-w-0 space-y-4">{footer}</div> : null}
    </div>
  );
}
