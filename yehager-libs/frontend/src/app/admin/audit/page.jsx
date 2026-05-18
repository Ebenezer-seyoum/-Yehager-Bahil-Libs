import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminAuditTable } from "@/components/admin-audit-table";

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin/audit");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  let logs = [];
  try {
    const response = await apiRequest("/api/v1/admin/audit?limit=200");
    logs = Array.isArray(response?.data) ? response.data : [];
  } catch {
    logs = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chronological activity and operational history.</p>
      </div>
      <AdminAuditTable logs={logs} />
    </div>
  );
}
