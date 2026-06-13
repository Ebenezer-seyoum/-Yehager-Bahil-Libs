import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminAlertsPanel } from "@/components/admin-alerts-panel";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminSupportTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin/support-tickets");
  }
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    redirect("/");
  }
  if (!can(session.user.permissions, "support.view")) {
    return <AccessRestricted requiredPermission="support.view" sectionName="Support Tickets" />;
  }

  let tickets = [];
  try {
    const response = await apiRequest("/api/v1/admin/alerts?limit=150");
    tickets = Array.isArray(response?.data) ? response.data : [];
  } catch {
    tickets = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Support Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track unresolved support issues and operational requests.</p>
      </div>
      <AdminAlertsPanel initialAlerts={tickets} />
    </div>
  );
}
