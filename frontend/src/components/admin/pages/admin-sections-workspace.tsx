"use client";

import { Plus } from "lucide-react";
import { AdminSectionManager } from "@/components/admin-section-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export const ADMIN_SECTION_SAVE_EVENT = "admin-sections:save-section";

export function AdminSectionsWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace
      pageId="sections"
      initialData={data}
      hideKpis
      filterPlaceholder="Search sections or subsections..."
      filterActions={() => (
        <div className="flex items-center gap-3 w-full">
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(ADMIN_SECTION_SAVE_EVENT))}
              className="btn btn-add"
              aria-label="Add Section"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>
          </div>
        </div>
      )}
    >
      {({ search }) => <AdminSectionManager externalSearch={search} />}
    </AdminWorkspace>
  );
}
