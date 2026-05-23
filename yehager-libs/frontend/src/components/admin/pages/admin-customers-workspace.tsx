"use client";

import { Suspense } from "react";
import { AdminCustomersDirectory } from "@/components/admin-customers-directory";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminCustomersWorkspace({ data }: { data: AdminWorkspaceData }) {
  return (
    <AdminWorkspace
      pageId="customers"
      initialData={data}
      showDateRange
      filterPlaceholder="Search customers by name or email..."
      hideFiltersOnTabs={["create"]}
      hideKpisOnTabs={["create"]}
    >
      {({ activeTab, filteredData, search }) =>
        activeTab === "create" ? (
          <Suspense fallback={<div className="rounded-2xl border border-blue-100 bg-white p-8 text-sm text-slate-500">Loading form…</div>}>
            <CreateCustomerForm />
          </Suspense>
        ) : (
          <AdminCustomersDirectory
            customers={(filteredData.users ?? []) as Parameters<typeof AdminCustomersDirectory>[0]["customers"]}
            query={search}
          />
        )
      }
    </AdminWorkspace>
  );
}
