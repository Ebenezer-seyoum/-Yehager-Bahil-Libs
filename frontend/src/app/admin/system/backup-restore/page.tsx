import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can, canAny } from "@/lib/permissions";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminBackupRestorePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/system/backup-restore");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "backup.view")) {
    return <AccessRestricted requiredPermission="backup.view" sectionName="Backup and Restore" />;
  }

  let audit: Record<string, unknown>[] = [];
  try {
    const response = canAny(session.user.permissions, ["audit.view", "activity.view"])
      ? await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/admin/audit?limit=200")
      : null;
    audit = Array.isArray(response?.data) ? response.data : [];
  } catch {
    audit = [];
  }

  return <AdminOperationsWorkspace mode="backup" data={{ audit }} />;
}
