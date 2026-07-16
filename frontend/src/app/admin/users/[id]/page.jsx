import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { EmployeeDetailClient } from "@/components/admin/employee-detail-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function EmployeeDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "employees.view")) {
    return <AccessRestricted requiredPermission="employees.view" sectionName="Employee" />;
  }

  const { id } = await params;

  let payload = null;
  try {
    const response = await apiRequest(`/api/backend/admin/users/${id}`);
    payload = response?.data ?? null;
  } catch {
    payload = null;
  }

  if (!payload) redirect("/admin/users");

  return (
    <EmployeeDetailClient
      initialPayload={payload}
      backTab="all"
      canAssignRole={session.user.role === "admin" || can(session.user.permissions, "roles.assign")}
      canEdit={session.user.role === "admin" || can(session.user.permissions, "employees.edit")}
      canUpdateStatus={
        session.user.role === "admin" ||
        can(session.user.permissions, "employees.edit") ||
        can(session.user.permissions, "employees.status.update")
      }
      canDelete={session.user.role === "admin" || can(session.user.permissions, "employees.delete")}
      currentUserId={session.user.id}
    />
  );
}
