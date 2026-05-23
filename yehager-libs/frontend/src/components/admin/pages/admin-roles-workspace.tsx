"use client";

import { ReferenceRolePermissionPanel } from "@/components/reference-role-permission-panel";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminRolesWorkspace({
  data,
  users,
  roles,
  permissions,
}: {
  data: AdminWorkspaceData;
  users: Parameters<typeof ReferenceRolePermissionPanel>[0]["users"];
  roles: Parameters<typeof ReferenceRolePermissionPanel>[0]["roles"];
  permissions: Parameters<typeof ReferenceRolePermissionPanel>[0]["permissions"];
}) {
  return (
    <AdminWorkspace pageId="roles" initialData={data} hideFilters>
      {() => <ReferenceRolePermissionPanel users={users} roles={roles} permissions={permissions} />}
    </AdminWorkspace>
  );
}
