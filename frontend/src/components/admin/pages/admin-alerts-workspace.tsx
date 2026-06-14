"use client";

import { AdminAlertsDirectory } from "@/components/admin-alerts-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminAlertsWorkspace({
  data,
  pageId = "alerts",
}: {
  data: AdminWorkspaceData;
  pageId?: "alerts" | "support-inbox";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setTab(tabId: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function goToNotificationQueue(value: string) {
    if (!value) return;
    router.push(value);
  }

  return (
    <AdminWorkspace
      pageId={pageId}
      initialData={data}
      hideKpis
      filterPlaceholder="Search alerts by title, message, or type..."
      filterActions={({ activeTab }) => (
        <>
          <select
            defaultValue=""
            onChange={(event) => goToNotificationQueue(event.target.value)}
            className="h-9 min-w-[230px] rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Notification queue shortcut"
          >
            <option value="">Notification queues</option>
            <option value="/admin/payments?filter=awaiting-verification">Payments awaiting verification</option>
            <option value="/admin/custom-orders?tab=requests&filter=awaiting-review">Custom requests awaiting review</option>
            <option value="/admin/custom-orders?tab=orders&filter=awaiting-review">Custom orders awaiting review</option>
            <option value="/admin/catalog-orders?filter=awaiting-review">Catalog orders awaiting review</option>
            <option value="/admin/orders/returns-refunds?filter=awaiting-review">Refund issues awaiting review</option>
          </select>
          <select
            value={activeTab}
            onChange={(event) => setTab(event.target.value)}
            className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Notification status filter"
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
        </>
      )}
    >
      {({ filteredData, search }) => (
        <AdminAlertsDirectory
          alerts={(filteredData.alerts ?? []) as Parameters<typeof AdminAlertsDirectory>[0]["alerts"]}
          search={search}
        />
      )}
    </AdminWorkspace>
  );
}
