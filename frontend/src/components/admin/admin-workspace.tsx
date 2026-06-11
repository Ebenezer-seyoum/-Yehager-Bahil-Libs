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
import { cn } from "@/lib/utils";
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
  hideKpis,
  hideFiltersOnTabs,
  hideKpisOnTabs,
  showExport,
  onExport,
  showDateRange,
  primaryAction,
  filterActions,
  headerNotice,
  filterPlaceholder,
  maxWidth = "max-w-screen-2xl",
  showRecordsBadge = true,
  footer,
  title,
  subtitle,
  icon,
  defaultTab,
  tabs,
  actions,
  pageClassName,
}: {
  pageId: AdminPageId;
  initialData: AdminWorkspaceData;
  children: (ctx: {
    activeTab: string;
    filteredData: AdminWorkspaceData;
    search: string;
    dateRange: DateRangeKey;
    setDisplayedRecordsCount: (count: number | null) => void;
  }) => ReactNode;
  hideTabs?: boolean;
  hideFilters?: boolean;
  /** Hide filter bar when one of these tab ids is active */
  hideFiltersOnTabs?: string[];
  /** Hide KPI row when one of these tab ids is active */
  hideKpisOnTabs?: string[];
  /** Hide KPI row entirely for this workspace */
  hideKpis?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  showDateRange?: boolean;
  primaryAction?: ReactNode;
  filterActions?: ReactNode | ((ctx: { activeTab: string; filteredData: AdminWorkspaceData; search: string; dateRange: DateRangeKey }) => ReactNode);
  headerNotice?: string;
  filterPlaceholder?: string;
  maxWidth?: string;
  showRecordsBadge?: boolean;
  /** Charts / insights only — never duplicate KPI cards */
  footer?: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: any;
  defaultTab?: string;
  tabs?: { id: string; label: string; icon: any }[];
  actions?: ReactNode;
  pageClassName?: string;
}) {
  const meta = getPageMeta(pageId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRefreshing, startTransition] = useTransition();
  const [data, setData] = useState(initialData ?? ({} as AdminWorkspaceData));
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeKey>("Last 30 Days");
  const [displayedRecordsCount, setDisplayedRecordsCount] = useState<number | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const activeTab = searchParams.get("tab") ?? defaultTab ?? meta.defaultTab;

  const setActiveTab = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const dateFilteredData = useMemo(() => {
    const orders = data?.orders ?? [];
    if (!showDateRange || !orders.length) return data ?? ({} as AdminWorkspaceData);
    return { ...data, orders: rowsInDateRange(orders, dateRange) };
  }, [data, dateRange, showDateRange]);

  const tabFilteredData = useMemo(
    () => applyTabQuery(pageId, activeTab, dateFilteredData),
    [pageId, activeTab, dateFilteredData],
  );

  const kpiData = pageId === "uploaded-designs" ? dateFilteredData : tabFilteredData;
  const kpis = useMemo(() => computePageKpis(pageId, kpiData), [pageId, kpiData]);
  const showKpis = !hideKpis && !hideKpisOnTabs?.includes(activeTab);
  const showFilters = !hideFilters && !hideFiltersOnTabs?.includes(activeTab);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setData(initialData);
    });
  }, [initialData, router]);

  const recordsCount = useMemo(() => {
    switch (pageId) {
      case "employees":
      case "customers":
      case "roles":
        return (tabFilteredData.users ?? []).length;
      case "orders":
        return (tabFilteredData.orders ?? []).length;
      case "payments":
        return ((tabFilteredData.orders ?? []) as any[]).filter((o) => o.paymentStatus || o.paymentMethod).length;
      case "uploaded-designs":
        return (tabFilteredData.uploadedDesigns ?? []).length;
      case "activity-logs":
        return (tabFilteredData.audit ?? []).length;
      case "documents":
        return (tabFilteredData.documents ?? []).length;
      case "products":
        return (tabFilteredData.products ?? []).length;
      case "sections":
        return (tabFilteredData.sections ?? []).length;
      default:
        return 0;
    }
  }, [pageId, tabFilteredData]);

  return (
    <div className={cn("mx-auto w-full space-y-4 pb-8", maxWidth, pageClassName)}>
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
        primaryAction={primaryAction ?? actions}
        notice={headerNotice}
        title={title}
        subtitle={subtitle}
        icon={icon}
      />

      {/* 2. Compact KPI cards — top only */}
      {showKpis ? <KPIGrid metrics={kpis} /> : null}

      {/* 3. Tabs */}
      {!hideTabs ? (
        <AdminTabs tabs={tabs ?? meta.tabs} activeTab={activeTab} onChange={setActiveTab} />
      ) : null}

      {/* 4. Filters / search / actions */}
      {showFilters ? (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder={filterPlaceholder ?? filterPlaceholderFor(pageId)}
          showExport={showExport}
          onExport={onExport}
          recordsCount={showRecordsBadge === false ? undefined : (displayedRecordsCount ?? recordsCount)}
          actions={typeof filterActions === "function" ? filterActions({ activeTab, filteredData: tabFilteredData, search, dateRange }) : filterActions ?? primaryAction}
        />
      ) : null}

      {/* 5. Main content (tables) */}
      <div className="min-w-0">{children({ activeTab, filteredData: tabFilteredData, search, dateRange, setDisplayedRecordsCount })}</div>

      {/* 6. Optional charts / insights */}
      {footer ? <div className="min-w-0 space-y-4">{footer}</div> : null}
    </div>
  );
}
