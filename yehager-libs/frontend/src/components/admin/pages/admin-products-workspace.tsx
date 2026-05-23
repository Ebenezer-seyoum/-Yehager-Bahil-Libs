"use client";

import { AdminProductManager } from "@/components/admin-product-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminProductsWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace
      pageId="products"
      initialData={data}
      filterPlaceholder="Search clothes by name, category, or cultural style..."
    >
      {({ filteredData, search }) => (
        <AdminProductManager
          initialProducts={(filteredData.products ?? []) as Parameters<typeof AdminProductManager>[0]["initialProducts"]}
          externalSearch={search}
        />
      )}
    </AdminWorkspace>
  );
}
