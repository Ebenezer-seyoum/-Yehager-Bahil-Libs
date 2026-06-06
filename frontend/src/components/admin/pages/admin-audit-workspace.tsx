"use client";

import { AdminAuditTable } from "@/components/admin-audit-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminAuditWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace pageId="activity-logs" initialData={data} hideFilters>
      {({ filteredData }) => (
        <AdminAuditTable logs={(filteredData.audit ?? []) as Parameters<typeof AdminAuditTable>[0]["logs"]} />
      )}
    </AdminWorkspace>
  );
}
