import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

export default async function AdminAlertsPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin/alerts");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  const query = (await searchParams) ?? {};

  async function resolveAlert(formData) {
    "use server";
    const alertId = String(formData.get("alertId") ?? "");
    if (!alertId) return;
    try {
      await apiRequest(`/api/v1/admin/alerts/${alertId}`, {
        method: "PATCH",
        body: { isResolved: true },
      });
      revalidatePath("/admin/alerts");
      redirect("/admin/alerts?saved=1");
    } catch {
      redirect("/admin/alerts?error=1");
    }
  }

  let alerts = [];
  try {
    const response = await apiRequest("/api/v1/admin/alerts?limit=150");
    alerts = Array.isArray(response?.data) ? response.data : [];
  } catch {
    alerts = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">System Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and resolve operational alerts.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Orders
        </Link>
        <Link href="/admin/alerts" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Alerts
        </Link>
        <Link href="/admin/audit" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Audit Logs
        </Link>
      </div>
      {query.saved === "1" ? (
        <div className="rounded-md border border-border bg-card p-3 text-sm text-primary">Alert marked as resolved.</div>
      ) : null}
      {query.error === "1" ? (
        <div className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">
          Could not update alert. Please retry.
        </div>
      ) : null}

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No alerts found.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {alert.type} · {alert.severity} · {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
                {alert.isResolved ? (
                  <span className="rounded bg-secondary px-2 py-1 text-xs">Resolved</span>
                ) : (
                  <form action={resolveAlert}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                      Mark Resolved
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
