import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminAuditWorkspace } from "@/components/admin/pages/admin-audit-workspace";

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/audit");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  let audit = [];
  try {
    const response = await apiRequest("/api/v1/admin/audit?limit=200");
    audit = Array.isArray(response?.data) ? response.data : [];
  } catch {
    audit = [];
  }

  return <AdminAuditWorkspace data={{ audit }} />;
}
