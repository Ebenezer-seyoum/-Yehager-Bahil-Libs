"use client";

import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { AdminUploadedDesignsTable } from "@/components/admin-uploaded-designs-table";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminUploadedDesignsWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace
      pageId="uploaded-designs"
      initialData={data}
      showExport
      filterPlaceholder="Search uploaded design requests..."
    >
      {({ filteredData, search }) => (
        <AdminUploadedDesignsTable
          rows={(filteredData.uploadedDesigns ?? []) as Parameters<typeof AdminUploadedDesignsTable>[0]["rows"]}
          search={search}
        />
      )}
    </AdminWorkspace>
  );
}
