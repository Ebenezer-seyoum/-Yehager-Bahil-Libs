import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminAlertsWorkspace } from "@/components/admin/pages/admin-alerts-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminAlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin/alerts");
  }
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    redirect("/");
  }
  if (!can(session.user.permissions, "alerts.view")) {
    return <AccessRestricted requiredPermission="alerts.view" sectionName="Alerts" />;
  }

  let alerts = [];
  try {
    const response = await apiRequest("/api/v1/admin/alerts?limit=150");
    alerts = Array.isArray(response?.data) ? response.data : [];
  } catch {
    alerts = [];
  }

  return <AdminAlertsWorkspace data={{ alerts }} />;
}
