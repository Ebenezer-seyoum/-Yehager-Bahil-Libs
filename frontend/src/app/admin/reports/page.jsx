import { Suspense } from "react";
import { redirect } from "next/navigation";

const DEFAULT_REPORT = "business-overview";
const DEFAULT_CATEGORY = "overview";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminReportsDashboard } from "@/components/reports/admin-reports-dashboard";
import { AccessRestricted } from "@/components/admin/access-restricted";

function ReportsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[#f7f9fc] text-sm font-semibold text-slate-500">
      Loading reports…
    </div>
  );
}

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/reports");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "reports.view")) {
    return <AccessRestricted requiredPermission="reports.view" sectionName="Reports" />;
  }

  let reportsPayload = null;

  try {
    const response = await apiRequest("/api/v1/admin/reports");
    reportsPayload = response?.data ?? null;
  } catch {
    reportsPayload = null;
  }

  const reports = reportsPayload ?? { orders: { rows: [] }, products: { rows: [] }, customers: { rows: [] }, support: { rows: [] }, delivery: { rows: [] }, financial: { rows: [] } };

  return (
    <Suspense fallback={<ReportsLoading />}>
      <AdminReportsDashboard
        reports={reports}
        initialCategory={DEFAULT_CATEGORY}
        initialReport={DEFAULT_REPORT}
      />
    </Suspense>
  );
}
