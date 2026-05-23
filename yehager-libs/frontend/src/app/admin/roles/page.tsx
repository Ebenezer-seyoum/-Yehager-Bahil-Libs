import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminRolesWorkspace } from "@/components/admin/pages/admin-roles-workspace";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
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
  createdAt: string;
  updatedAt: string;
};

export default async function AdminRolesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/roles");
  if (!can(session.user.permissions, "roles.view")) redirect("/");

  let users: User[] = [];
  let permissions: Permission[] = [];
  let roles: Role[] = [];
  try {
    const [usersResponse, permissionsResponse, rolesResponse] = await Promise.all([
      apiRequest<{ data: User[] }>("/api/v1/admin/users?limit=200"),
      apiRequest<{ data: Permission[] }>("/api/v1/admin/permissions"),
      apiRequest<{ data: Role[] }>("/api/v1/admin/roles"),
    ]);
    users = usersResponse.data ?? [];
    permissions = permissionsResponse.data ?? [];
    roles = rolesResponse.data ?? [];
  } catch {
    users = [];
    permissions = [];
    roles = [];
  }

  return (
    <AdminRolesWorkspace
      data={{ users, roles, permissions }}
      users={users}
      roles={roles}
      permissions={permissions}
    />
  );
}
