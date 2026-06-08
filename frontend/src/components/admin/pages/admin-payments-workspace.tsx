"use client";

import { useMemo } from "react";
import { Banknote, FileText, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPaymentsTable } from "@/components/admin-payments-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminPaymentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "pending";

  const orders = useMemo(() => (data.orders ?? []), [data.orders]);

  return (
    <AdminWorkspace
      pageId="payments"
      initialData={data}
      title="Financial Verification"
      subtitle="Verify bank transfers, process manual payments, and manage order finances"
      icon={Banknote}
      defaultTab="pending"
      tabs={[
        { id: "pending", label: "Awaiting Verification", icon: Clock },
        { id: "verified", label: "Verified", icon: CheckCircle2 },
        { id: "failed", label: "Failed / Rejected", icon: XCircle },
        { id: "all", label: "Transfers History", icon: FileText },
      ]}
      actions={
        <div className="flex items-center gap-2">
           <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
              <Filter className="h-4 w-4" /> Filter
           </button>
        </div>
      }
    >
      {({ filteredData, search }) => (
        <AdminPaymentsTable
          initialOrders={(filteredData.orders ?? []) as any}
          externalSearch={search}
          viewMode="page"
        />
      )}
    </AdminWorkspace>
  );
}

import { Clock, CheckCircle2, XCircle } from "lucide-react";
