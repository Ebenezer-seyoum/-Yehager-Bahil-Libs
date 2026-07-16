import { Suspense } from "react";
import { AdminReportsDashboard } from "@/components/reports/admin-reports-dashboard";
import { apiRequest } from "@/lib/api-client";
import { requireEmployeePageAccess } from "@/lib/employee-access";
import type { ReportsPayload } from "@/lib/reports/report-data";

const DEFAULT_CATEGORY = "overview";
const DEFAULT_REPORT = "business-overview";

function ReportsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-muted-foreground">
      Loading reports…
    </div>
  );
}

export default async function EmployeeReportsPage() {
  const { session, profile } = await requireEmployeePageAccess(
    "/employee/reports",
    "reports.view",
  );

  let reports: ReportsPayload = {
    orders: { rows: [] },
    products: { rows: [] },
    customers: { rows: [] },
    support: { rows: [] },
    delivery: { rows: [] },
    financial: { rows: [] },
  };

  try {
    const response = await apiRequest<{ data?: ReportsPayload }>("/api/v1/admin/reports");
    reports = response.data ?? reports;
  } catch {
    // Keep the report workspace available with empty states if data loading fails.
  }

  const permissions = profile?.permissions ?? session.user.permissions ?? [];
  const canExport = session.user.role === "admin" || permissions.includes("reports.export");

  return (
    <Suspense fallback={<ReportsLoading />}>
      <AdminReportsDashboard
        reports={reports}
        initialCategory={DEFAULT_CATEGORY}
        initialReport={DEFAULT_REPORT}
        basePath="/employee/reports"
        canExport={canExport}
      />
    </Suspense>
  );
}
