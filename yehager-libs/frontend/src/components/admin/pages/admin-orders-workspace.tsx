"use client";

import { AdminOrdersTable } from "@/components/admin-orders-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminOrdersWorkspace({
  data,
  initialSelectedOrderId,
}: {
  data: AdminWorkspaceData;
  initialSelectedOrderId?: string | null;
}) {
  return (
    <AdminWorkspace
      pageId="orders"
      initialData={data}
      showExport
      showDateRange
      filterPlaceholder="Search by order #, customer, or email..."
    >
      {({ filteredData, search }) => (
        <AdminOrdersTable
          initialOrders={(filteredData.orders ?? []) as Parameters<typeof AdminOrdersTable>[0]["initialOrders"]}
          initialSelectedOrderId={initialSelectedOrderId}
          externalSearch={search}
          hideToolbar
        />
      )}
    </AdminWorkspace>
  );
}
