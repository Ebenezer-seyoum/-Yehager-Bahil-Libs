import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminEmployeesWorkspace } from "@/components/admin/pages/admin-employees-workspace";

export default async function AdminUsersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) redirect("/");

  const query = (await searchParams) ?? {};
  const canCreate = can(session.user.permissions, "employees.create");

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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — employee account created.
        </div>
      ) : null}
      {query.updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — employee information updated.
        </div>
      ) : null}
      {query.deleted === "1" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — user was deleted.
        </div>
      ) : null}
      {query.error && query.tab !== "create" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
          Action failed — please review the user details and try again.
        </div>
      ) : null}

      <AdminEmployeesWorkspace data={{ users: employees }} roles={roles} canCreate={canCreate} />
    </div>
  );
}
