import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { canAny } from "@/lib/permissions";
import { AdminAuditWorkspace } from "@/components/admin/pages/admin-audit-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/audit");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!canAny(session.user.permissions, ["audit.view", "activity.view"])) {
    return <AccessRestricted requiredPermission="audit.view or activity.view" sectionName="Audit" />;
  }

  let audit = [];
  try {
    const response = await apiRequest("/api/v1/admin/audit?limit=200");
    audit = Array.isArray(response?.data) ? response.data : [];
  } catch {
    audit = [];
  }

  return <AdminAuditWorkspace data={{ audit }} />;
}
