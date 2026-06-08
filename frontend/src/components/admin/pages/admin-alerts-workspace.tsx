"use client";

import { AdminAlertsDirectory } from "@/components/admin-alerts-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminAlertsWorkspace({
  data,
  pageId = "alerts",
}: {
  data: AdminWorkspaceData;
  pageId?: "alerts" | "support-inbox";
}) {
  return (
    <AdminWorkspace pageId={pageId} initialData={data} hideKpis filterPlaceholder="Search alerts by title, message, or type...">
      {({ filteredData, search }) => (
        <AdminAlertsDirectory
          alerts={(filteredData.alerts ?? []) as Parameters<typeof AdminAlertsDirectory>[0]["alerts"]}
          search={search}
        />
      )}
    </AdminWorkspace>
  );
}
