import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { EmployeeCreateClient } from "@/components/admin/employee-create-client";
import { filterAssignableEmployeeRoles } from "@/lib/admin/assignable-roles";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { can } from "@/lib/permissions";
import { apiRequest } from "@/lib/api-client";

type FetchedRole = { id: string; name: string; key?: string | null; isSystem?: boolean | null };

export default async function CreateEmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users/create");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "employees.create")) {
    return <AccessRestricted requiredPermission="employees.create" sectionName="Employee Create" />;
  }

  const canAssignRole = session.user.role === "admin" || can(session.user.permissions, "roles.assign");
  let roles: FetchedRole[] = [];
  if (canAssignRole) {
    try {
      const rolesData = await apiRequest<{ data?: FetchedRole[]; roles?: FetchedRole[] }>("/api/v1/admin/roles");
      roles = Array.isArray(rolesData?.data)
        ? filterAssignableEmployeeRoles(rolesData.data)
        : Array.isArray(rolesData?.roles)
          ? filterAssignableEmployeeRoles(rolesData.roles)
          : [];
    } catch {
      roles = [];
    }
  }

  return <EmployeeCreateClient roles={roles} />;
}
