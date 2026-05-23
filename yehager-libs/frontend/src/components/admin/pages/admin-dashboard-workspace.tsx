"use client";

import { AdminRevenueCharts } from "@/components/admin-revenue-charts";
import { AdminWorkflowPipeline } from "@/components/admin-workflow-pipeline";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminDashboardWorkspace({ data }: { data: AdminWorkspaceData }) {
  const orders = (data.orders ?? []) as Parameters<typeof AdminRevenueCharts>[0]["orders"];

  return (
    <AdminWorkspace
      pageId="dashboard"
      initialData={data}
      hideFilters
      showDateRange
      footer={<AdminRevenueCharts orders={orders} />}
    >
      {() => <AdminWorkflowPipeline orders={orders} />}
    </AdminWorkspace>
  );
}
