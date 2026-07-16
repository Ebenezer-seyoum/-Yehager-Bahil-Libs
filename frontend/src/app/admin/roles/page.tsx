import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminRolesWorkspace } from "@/components/admin/pages/admin-roles-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  roleStatus?: "unassigned" | "assigned";
  assignedRoleId?: string | null;
};

type Permission = {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  category: string;
  severity: string;
  entityType?: string | null;
  entityId?: string | null;
  performedBy?: string | null;
  details?: string | null;
  createdAt?: string | null;
};

export default async function AdminRolesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/roles");
  if (!can(session.user.permissions, "roles.view")) {
    return <AccessRestricted requiredPermission="roles.view" sectionName="Role and permission" />;
  }

  const isAdmin = session.user.role === "admin";
  const has = (permission: string) => isAdmin || can(session.user.permissions, permission);
  const hasRoleManage = has("roles.manage");
  const capabilities = {
    create: hasRoleManage || has("roles.create"),
    edit: hasRoleManage || has("roles.edit"),
    delete: hasRoleManage || has("roles.delete"),
    assign: hasRoleManage || has("roles.assign"),
    viewActivity: has("audit.view") || has("activity.view"),
  };

  let users: User[] = [];
  let permissions: Permission[] = [];
  let roles: Role[] = [];
  let audit: AuditLog[] = [];
  const [usersResponse, permissionsResponse, rolesResponse, auditResponse] = await Promise.all([
    capabilities.assign
      ? apiRequest<{ data: User[] }>("/api/v1/admin/users?limit=200").catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] as User[] }),
    apiRequest<{ data: Permission[] }>("/api/v1/admin/permissions").catch(() => ({ data: [] })),
    apiRequest<{ data: Role[] }>("/api/v1/admin/roles").catch(() => ({ data: [] })),
    capabilities.viewActivity
      ? apiRequest<{ data: AuditLog[] }>("/api/v1/admin/audit?limit=200").catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] as AuditLog[] }),
  ]);
  users = (usersResponse.data ?? []).filter((user) => user.role === "employee");
  permissions = permissionsResponse.data ?? [];
  roles = rolesResponse.data ?? [];
  audit = (auditResponse.data ?? []).filter((log) =>
    ["role_created", "role_permissions_updated", "employee_access_assigned", "user_permissions_updated", "user_role_updated"].includes(log.action),
  );

  return (
    <AdminRolesWorkspace
      data={{ users, roles, permissions, audit }}
      users={users}
      roles={roles}
      permissions={permissions}
      audit={audit}
      capabilities={capabilities}
    />
  );
}
