import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminEmployeesWorkspace } from "@/components/admin/pages/admin-employees-workspace";
import { DashboardNotice } from "@/components/admin/dashboard-notice";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminUsersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) {
    return <AccessRestricted requiredPermission="employees.view" sectionName="Employee" />;
  }

  const query = (await searchParams) ?? {};
  const canCreate = can(session.user.permissions, "employees.create");
  const canEdit = can(session.user.permissions, "employees.edit");
  const canDelete = can(session.user.permissions, "employees.delete");
  const canAssignRole = can(session.user.permissions, "roles.assign");

  let users = [];
  let roles = [];
  try {
    const [response, rolesResponse] = await Promise.all([
      apiRequest("/api/v1/admin/users?limit=200"),
      apiRequest("/api/v1/admin/roles"),
    ]);
    users = Array.isArray(response?.data) ? response.data : [];
    roles = Array.isArray(rolesResponse?.data) ? rolesResponse.data : [];
  } catch {
    users = [];
    roles = [];
  }

  const employees = users.filter((user) =>
    ["employee", "admin"].includes(String(user.role ?? "").toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {query.created === "1" ? (
        <DashboardNotice tone="success">Success! Employee account created.</DashboardNotice>
      ) : null}
      {query.updated ? (
        <DashboardNotice tone="success">Success! Employee information updated.</DashboardNotice>
      ) : null}
      {query.deleted === "1" ? (
        <DashboardNotice tone="success">Success! User was deleted.</DashboardNotice>
      ) : null}
      {query.error && query.tab !== "create" ? (
        <DashboardNotice tone="error">Error! Please review the user details and try again.</DashboardNotice>
      ) : null}

      <AdminEmployeesWorkspace
        data={{ users: employees }}
        roles={roles}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canAssignRole={canAssignRole}
      />
    </div>
  );
}
