"use client";

import { AdminSectionManager } from "@/components/admin-section-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminSectionsWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace pageId="sections" initialData={data} hideFilters>
      {() => <AdminSectionManager />}
    </AdminWorkspace>
  );
}
