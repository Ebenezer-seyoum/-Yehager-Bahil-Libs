"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FileText, Search as SearchIcon } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { AdminOrdersTable } from "@/components/admin-orders-table";
import { AdminUploadedDesignsTable } from "@/components/admin-uploaded-designs-table";
import type { AdminWorkspaceData } from "@/lib/admin/types";

function requestNeedsReview(row: Record<string, unknown>) {
  return ["submitted", "in_review", "under_review", "needs_changes"].includes(String(row.status ?? "").toLowerCase());
}

function orderNeedsReview(row: Record<string, unknown>) {
  const status = String(row.status ?? "pending").toLowerCase();
  const payment = String(row.paymentStatus ?? "pending").toLowerCase();
  return ["pending", "processing"].includes(status) || payment === "awaiting_verification";
}

export function AdminCustomOrdersWorkspace({
  data,
  initialTab,
  canViewRequests,
  canViewOrders,
  canReviewRequests,
}: {
  data: AdminWorkspaceData;
  initialTab?: string | null;
  canViewRequests: boolean;
  canViewOrders: boolean;
  canReviewRequests: boolean;
}) {
  const requests = (data.uploadedDesigns ?? []) as Parameters<typeof AdminUploadedDesignsTable>[0]["rows"];
  const orders = (data.orders ?? []) as Parameters<typeof AdminOrdersTable>[0]["initialOrders"];
  const [viewedDesignIds, setViewedDesignIds] = useState<string[]>([]);
  const [viewedOrderIds, setViewedOrderIds] = useState<string[]>([]);
  const requestBadge = useMemo(
    () => requests.filter((row) => requestNeedsReview(row as Record<string, unknown>) && !viewedDesignIds.includes(row.id)).length,
    [requests, viewedDesignIds],
  );
  const orderBadge = useMemo(
    () => orders.filter((row) => orderNeedsReview(row as Record<string, unknown>) && !viewedOrderIds.includes(row.id)).length,
    [orders, viewedOrderIds],
  );

  useEffect(() => {
    const readList = (key: string) => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };
    const timeoutId = window.setTimeout(() => {
      setViewedDesignIds(readList("admin-viewed-custom-design-notifications"));
      setViewedOrderIds(readList("admin-viewed-order-notifications"));
    }, 0);

    const onDesignViewed = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setViewedDesignIds((current) => Array.from(new Set([...current, id])));
    };
    const onOrderViewed = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setViewedOrderIds((current) => Array.from(new Set([...current, id])));
    };
    window.addEventListener("admin-custom-design-viewed", onDesignViewed);
    window.addEventListener("admin-order-viewed", onOrderViewed);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("admin-custom-design-viewed", onDesignViewed);
      window.removeEventListener("admin-order-viewed", onOrderViewed);
    };
  }, []);

  function SearchResultBadge({ query, activeTab }: { query: string; activeTab: string }) {
    const [finished, setFinished] = useState(false);
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
      setFinished(false);
      if (!query || !query.trim()) {
        setCount(null);
        const t = setTimeout(() => setFinished(false), 300);
        return () => clearTimeout(t);
      }
      const handler = setTimeout(() => {
        const q = query.trim().toLowerCase();
        const rows = activeTab === "orders" ? orders : requests;
        const matches = rows.filter((row) =>
          Object.values(row as Record<string, unknown>)
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ")
            .includes(q),
        ).length;
        setCount(matches);
        setFinished(true);
      }, 400);
      return () => clearTimeout(handler);
    }, [activeTab, query]);

    if (!finished || count == null || !query.trim()) return null;
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-700" aria-live="polite">
        <SearchIcon className="h-4 w-4 text-primary" />
        <span className="font-medium">{count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">results</span>
      </div>
    );
  }

  return (
    <AdminWorkspace
      pageId="orders"
      initialData={data}
      hideKpis
      showExport
      filterPlaceholder="Search custom requests or orders..."
      title="Custom Orders"
      subtitle="Manage uploaded design requests and real custom orders after checkout."
      defaultTab={initialTab === "orders" ? "orders" : "requests"}
      tabs={[
        ...(canViewRequests ? [{ id: "requests", label: "Requests", icon: FileText, badgeCount: requestBadge }] : []),
        ...(canViewOrders ? [{ id: "orders", label: "Orders", icon: ClipboardList, badgeCount: orderBadge }] : []),
      ]}
      filterActions={({ activeTab, search }) => (
        <div className="flex items-center gap-3 w-full">
          <SearchResultBadge query={search} activeTab={activeTab} />
        </div>
      )}
    >
      {({ activeTab, filteredData, search, setDisplayedRecordsCount }) =>
        activeTab === "orders" ? (
          <AdminOrdersTable
            initialOrders={(filteredData.orders ?? []) as Parameters<typeof AdminOrdersTable>[0]["initialOrders"]}
            lockedOrderType="custom_order"
            externalSearch={search}
            onFilteredCountChange={setDisplayedRecordsCount}
            hideToolbar
          />
        ) : (
          <AdminUploadedDesignsTable
            rows={(filteredData.uploadedDesigns ?? []) as Parameters<typeof AdminUploadedDesignsTable>[0]["rows"]}
            search={search}
            onFilteredCountChange={setDisplayedRecordsCount}
            canReview={canReviewRequests}
          />
        )
      }
    </AdminWorkspace>
  );
}
