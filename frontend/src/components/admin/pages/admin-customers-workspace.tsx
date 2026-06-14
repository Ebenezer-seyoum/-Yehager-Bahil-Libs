"use client";

import { useMemo } from "react";
import { Plus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminCustomersDirectory } from "@/components/admin-customers-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminCustomersWorkspace({ data, canCreate = false }: { data: AdminWorkspaceData; canCreate?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const activeTab = searchParams.get("tab") || "all";
  const search = searchParams.get("search") || "";

  const filteredData = useMemo(() => {
    const users = (data.users || []);
    // Simple filtering based on tab — can be expanded as needed
    if (activeTab === "all") return { ...data, users };
    if (activeTab === "active") return { ...data, users: users.filter((u: any) => String(u.accountStatus || u.status).toLowerCase() === "active") };
    if (activeTab === "inactive") return { ...data, users: users.filter((u: any) => String(u.accountStatus || u.status).toLowerCase() !== "active") };
    return { ...data, users };
  }, [data.users, activeTab, data]);

  return (
    <AdminWorkspace
      pageId="customers"
      initialData={data}
      title="Customer Management"
      subtitle="Overview of all registered customers, their accounts, and purchase history"
      icon={Users}
      defaultTab="all"
      hideKpis={true}
      tabs={[
        { id: "all", label: "All Customers", icon: Users },
        { id: "active", label: "Active", icon: Users },
        { id: "inactive", label: "Inactive", icon: Users },
      ]}
      actions={
        canCreate ? (
          <button
            type="button"
            onClick={() => router.push("/admin/customers/create")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-800 px-4 text-sm font-bold text-white shadow-lg hover:bg-green-900 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        ) : null
      }
    >
      {({ search }) => (
        <AdminCustomersDirectory
          data={filteredData}
          tab={activeTab}
          query={search}
        />
      )}
    </AdminWorkspace>
  );
}
