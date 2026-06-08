"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminUsersDirectory } from "@/components/admin-users-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { Search, Plus } from "lucide-react";
import type { AdminWorkspaceData, EmployeeDirectoryUser, Role } from "@/lib/admin/types";

export function AdminEmployeesWorkspace({
  data,
  roles = [],
  canCreate = true,
  canEdit = false,
  canDelete = false,
  canAssignRole = false,
}: {
  data: AdminWorkspaceData;
  roles?: Role[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignRole?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "all";
  const search = searchParams.get("search") || "";

  const filteredData = useMemo(() => {
    const users = (data.users || []) as EmployeeDirectoryUser[];
    if (activeTab === "all") return { users };
    if (activeTab === "active") return { users: users.filter((u) => String(u.accountStatus).toLowerCase() === "active" || String(u.status).toLowerCase() === "active") };
    if (activeTab === "inactive") return { users: users.filter((u) => String(u.accountStatus).toLowerCase() !== "active" && String(u.status).toLowerCase() !== "active") };
    if (activeTab === "unassigned") return { users: users.filter((u) => !u.roleId && !u.assignedRoleId) };
    return { users };
  }, [data.users, activeTab]);

  function matchesRoleFilter(u: EmployeeDirectoryUser) {
    const roleFilter = searchParams.get("role");
    if (!roleFilter || roleFilter === "all") return true;
    return String(u.roleId || u.assignedRoleId) === roleFilter;
  }

  return (
    <AdminWorkspace
      title="Employee Management"
      subtitle="Manage your studio staff, roles, and access permissions"
      icon={Search}
      defaultTab="all"
      tabs={[
        { id: "all", label: "All Staff", icon: Search },
        { id: "active", label: "Active", icon: Search },
        { id: "inactive", label: "Inactive", icon: Search },
        { id: "unassigned", label: "Pending Role", icon: Search },
      ]}
      actions={
        canCreate && (
          <button
            onClick={() => router.push("/admin/users/create")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        )
      }
    >
      {({ search }) => (
        <AdminUsersDirectory
          users={((filteredData.users ?? []) as EmployeeDirectoryUser[]).filter(matchesRoleFilter) as any}
          query={search}
          mode={activeTab}
          canAssignRole={canAssignRole}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </AdminWorkspace>
  );
}
