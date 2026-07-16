"use client";

import { AdminAlertsDirectory } from "@/components/admin-alerts-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminAlertsWorkspace({
  data,
  pageId = "alerts",
  canManage,
  queueAccess,
}: {
  data: AdminWorkspaceData;
  pageId?: "alerts" | "support-inbox";
  canManage: boolean;
  queueAccess: {
    payments: boolean;
    customRequests: boolean;
    customOrders: boolean;
    catalogOrders: boolean;
    returns: boolean;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueOptions = [
    { allowed: queueAccess.payments, value: "/admin/payments?filter=awaiting-verification", label: "Payments awaiting verification" },
    { allowed: queueAccess.customRequests, value: "/admin/custom-orders?tab=requests&filter=awaiting-review", label: "Custom requests awaiting review" },
    { allowed: queueAccess.customOrders, value: "/admin/custom-orders?tab=orders&filter=awaiting-review", label: "Custom orders awaiting review" },
    { allowed: queueAccess.catalogOrders, value: "/admin/catalog-orders?filter=awaiting-review", label: "Catalog orders awaiting review" },
    { allowed: queueAccess.returns, value: "/admin/orders/returns-refunds?filter=awaiting-review", label: "Refund issues awaiting review" },
  ].filter((option) => option.allowed);

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
          {queueOptions.length ? <select
            defaultValue=""
            onChange={(event) => goToNotificationQueue(event.target.value)}
            className="h-9 min-w-[230px] rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Notification queue shortcut"
          >
            <option value="">Notification queues</option>
            {queueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : null}
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
          canManage={canManage}
        />
      )}
    </AdminWorkspace>
  );
}
