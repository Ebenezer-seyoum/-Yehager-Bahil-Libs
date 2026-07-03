import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { EmployeeDetailClient } from "@/components/admin/employee-detail-client";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function EmployeeDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) {
    return <AccessRestricted requiredPermission="employees.view" sectionName="Employee" />;
  }

  const { employeeId } = await params;
  const query = (await searchParams) ?? {};
  const backTab = typeof query.tab === "string" ? query.tab : "all";

  let payload = null;
  try {
    const response = await apiRequest(`/api/v1/admin/users/${employeeId}`);
    payload = response?.data ?? null;
  } catch {
    payload = null;
  }

  if (!payload?.user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">Employee not found.</h1>
        <p className="mt-1 text-sm text-slate-600">Unable to load employee details. Please try again.</p>
      </div>
    );
  }

  const canAssignRole = can(session.user.permissions, "roles.assign");
  const canEdit = can(session.user.permissions, "employees.edit");
  const canUpdateStatus = canEdit || can(session.user.permissions, "employees.status.update");
  const canDelete = can(session.user.permissions, "employees.delete");

  return (
    <EmployeeDetailClient
      initialPayload={payload}
      backTab={backTab}
      canAssignRole={canAssignRole}
      canEdit={canEdit}
      canUpdateStatus={canUpdateStatus}
      canDelete={canDelete}
      currentUserId={session.user.id}
    />
  );
}
