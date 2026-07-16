import { AdminAuditWorkspace } from "@/components/admin/pages/admin-audit-workspace";
import { apiRequest } from "@/lib/api-client";
import { requireEmployeePageAnyAccess } from "@/lib/employee-access";

export default async function EmployeeActivityPage() {
  await requireEmployeePageAnyAccess("/employee/activity", [
    "activity.view",
    "audit.view",
  ]);

  let audit: Record<string, unknown>[] = [];
  try {
    const response = await apiRequest<{ data?: Record<string, unknown>[] }>(
      "/api/v1/admin/audit?limit=200",
    );
    audit = Array.isArray(response.data) ? response.data : [];
  } catch {
    audit = [];
  }

  return <AdminAuditWorkspace data={{ audit }} />;
}
