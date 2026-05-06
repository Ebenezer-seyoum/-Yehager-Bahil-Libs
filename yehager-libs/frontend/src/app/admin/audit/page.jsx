import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chronological activity and operational history.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Orders
        </Link>
        <Link href="/admin/alerts" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Alerts
        </Link>
        <Link href="/admin/audit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Audit Logs
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-muted-foreground" colSpan={5}>
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.action}</p>
                    {log.details ? <p className="text-xs text-muted-foreground">{log.details}</p> : null}
                  </td>
                  <td className="px-4 py-3">{log.category}</td>
                  <td className="px-4 py-3">{log.severity}</td>
                  <td className="px-4 py-3">{log.performedBy ?? "system"}</td>
                  <td className="px-4 py-3">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
