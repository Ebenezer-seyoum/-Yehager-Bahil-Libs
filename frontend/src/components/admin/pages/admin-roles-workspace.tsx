"use client";

import { ReferenceRolePermissionPanel } from "@/components/reference-role-permission-panel";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminRolesWorkspace({
  data,
  users,
  roles,
  permissions,
  audit,
}: {
  data: AdminWorkspaceData;
  users: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["users"];
  roles: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["roles"];
  permissions: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["permissions"];
  audit: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["audit"];
}) {
  return (
    <AdminWorkspace pageId="roles" initialData={data} hideFilters>
      {({ activeTab }) => <ReferenceRolePermissionPanel users={users} roles={roles} permissions={permissions} audit={audit} activeTab={activeTab} />}
    </AdminWorkspace>
  );
}
