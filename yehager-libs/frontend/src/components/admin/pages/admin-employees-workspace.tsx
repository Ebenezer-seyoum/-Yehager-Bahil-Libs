"use client";

import { Suspense } from "react";
import { AdminUsersDirectory } from "@/components/admin-users-directory";
import { CreateEmployeeForm } from "@/components/admin/create-employee-form";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type Role = { id: string; name: string };

export function AdminEmployeesWorkspace({
  data,
  roles = [],
  canCreate = true,
}: {
  data: AdminWorkspaceData;
  roles?: Role[];
  canCreate?: boolean;
}) {
  return (
    <AdminWorkspace
      pageId="employees"
      initialData={data}
      filterPlaceholder="Search employees by name, email, or role..."
      hideFiltersOnTabs={["create"]}
      hideKpisOnTabs={["create"]}
    >
      {({ activeTab, filteredData, search }) =>
        activeTab === "create" ? (
          <Suspense fallback={<div className="rounded-2xl border border-blue-100 bg-white p-8 text-sm text-slate-500">Loading form…</div>}>
            <CreateEmployeeForm roles={roles} canCreate={canCreate} />
          </Suspense>
        ) : (
          <AdminUsersDirectory
            users={(filteredData.users ?? []) as Parameters<typeof AdminUsersDirectory>[0]["users"]}
            query={search}
          />
        )
      }
    </AdminWorkspace>
  );
}
