"use client";

import { useMemo } from "react";
import { Plus, Package, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminProductManager } from "@/components/admin-product-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import type { UploadedDesign } from "@/components/admin-uploaded-design-dialogs";

export function AdminProductsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "all";

  const products = useMemo(() => (data.products ?? []), [data.products]);

  return (
    <AdminWorkspace
      pageId="products"
      initialData={data}
      title="Product Management"
      subtitle="Organize, update, and manage your heritage clothing collection and stock"
      icon={Package}
      hideKpis={true}
      defaultTab="all"
      tabs={[
        { id: "all", label: "All Items", icon: Package },
        { id: "active", label: "Active", icon: Package },
        { id: "draft", label: "Drafts", icon: Package },
        { id: "low-stock", label: "Low Stock", icon: Package },
      ]}
      actions={
        <button
          type="button"
          onClick={() => router.push("/admin/inventory/create")}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      }
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => (
        <AdminProductManager
          initialProducts={(filteredData.products ?? []) as any}
          externalSearch={search}
          onFilteredCountChange={setDisplayedRecordsCount}
          viewMode="page"
        />
      )}
    </AdminWorkspace>
  );
}
