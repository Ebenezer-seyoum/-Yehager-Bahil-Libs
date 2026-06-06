"use client";

import { AdminOrderDocumentsManager } from "@/components/admin-order-documents-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminDocumentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace pageId="documents" initialData={data} hideFilters>
      {() => (
        <AdminOrderDocumentsManager
          initialOrders={(data.orders ?? []) as Parameters<typeof AdminOrderDocumentsManager>[0]["initialOrders"]}
        />
      )}
    </AdminWorkspace>
  );
}
