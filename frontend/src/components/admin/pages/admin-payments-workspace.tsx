"use client";

import { AdminPaymentsTable } from "@/components/admin-payments-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminPaymentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const pendingCount = (data.orders ?? []).filter(
    (o) => String(o.paymentStatus ?? "").toLowerCase() === "awaiting_verification",
  ).length;

  return (
    <AdminWorkspace
      pageId="payments"
      initialData={data}
      showExport
      showDateRange
      maxWidth="max-w-screen-2xl"
      headerNotice={
        pendingCount > 0 ? `${pendingCount} payment(s) awaiting verification` : undefined
      }
      filterPlaceholder="Search payments by order, customer, or reference..."
    >
      {({ filteredData, search }) => (
        <AdminPaymentsTable
          initialOrders={(filteredData.orders ?? []) as Parameters<typeof AdminPaymentsTable>[0]["initialOrders"]}
          externalSearch={search}
          hideToolbar
        />
      )}
    </AdminWorkspace>
  );
}
