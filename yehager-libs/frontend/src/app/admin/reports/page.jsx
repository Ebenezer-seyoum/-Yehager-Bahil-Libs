import { Suspense } from "react";
import { redirect } from "next/navigation";

const DEFAULT_REPORT = "business-overview";
const DEFAULT_CATEGORY = "overview";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminReportsDashboard } from "@/components/reports/admin-reports-dashboard";

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
