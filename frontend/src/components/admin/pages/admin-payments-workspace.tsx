"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { AdminPaymentsTable } from "@/components/admin-payments-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminPaymentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  return (
    <AdminWorkspace
      pageId="payments"
      initialData={data}
      hideKpis
      hideTabs
      title="Financial Verification"
      subtitle="Verify bank transfers, process manual payments, and manage order finances"
      icon={Banknote}
      defaultTab="all"
      filterActions={
        <div className="grid w-full gap-2 sm:grid-cols-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="awaiting_verification">Awaiting Verification</option>
            <option value="pending">Awaiting Proof</option>
            <option value="paid">Verified</option>
            <option value="failed">Failed / Rejected</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Methods</option>
            <option value="stripe">Stripe Card</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
      }
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => (
        <AdminPaymentsTable
          initialOrders={(filteredData.orders ?? []) as any}
          externalSearch={search}
          statusFilter={statusFilter}
          methodFilter={methodFilter}
          onFilteredCountChange={setDisplayedRecordsCount}
          viewMode="page"
        />
      )}
    </AdminWorkspace>
  );
}
