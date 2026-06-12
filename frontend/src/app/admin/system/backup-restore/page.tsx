import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";

export default async function AdminBackupRestorePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/system/backup-restore");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  let audit: Record<string, unknown>[] = [];
  try {
    const response = await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/admin/audit?limit=200");
    audit = Array.isArray(response?.data) ? response.data : [];
  } catch {
    audit = [];
  }

  return <AdminOperationsWorkspace mode="backup" data={{ audit }} />;
}
