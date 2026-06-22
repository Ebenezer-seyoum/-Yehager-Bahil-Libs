"use client";

import { Plus } from "lucide-react";
import { AdminSectionManager } from "@/components/admin-section-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export const ADMIN_SECTION_SAVE_EVENT = "admin-sections:save-section";

type HomepageSection = {
  id: string;
  name: string;
  slug?: string;
  isActive: boolean;
  sortOrder: number;
  collections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
  subsections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
};

type ProductItem = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  category?: string | null;
  images?: string[] | null;
  priceUsd?: string | number | null;
  uniqueId?: string | null;
  isActive?: boolean;
};

export function AdminSectionsWorkspace({
  data,
  canEdit = false,
  canDelete = false,
}: {
  data: AdminWorkspaceData;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  return (
    <AdminWorkspace
      pageId="sections"
      initialData={data}
      hideFilters
      hideKpis
      title="Tribes & Regions"
      subtitle="Organize customer-facing tribes, regions, and homepage category visibility."
      actions={canEdit ? (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ADMIN_SECTION_SAVE_EVENT))}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95"
          aria-label="Add Tribe"
        >
          <Plus className="h-4 w-4" />
          Add Tribe
        </button>
      ) : null}
    >
      {({ search }) => (
        <AdminSectionManager
          externalSearch={search}
          initialSections={(data.sections ?? []) as HomepageSection[]}
          products={(data.products ?? []) as ProductItem[]}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </AdminWorkspace>
  );
}
