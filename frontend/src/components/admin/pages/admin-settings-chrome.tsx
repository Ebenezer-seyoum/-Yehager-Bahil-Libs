"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { KPIGrid } from "@/components/admin/kpi-grid";
import { computePageKpis } from "@/lib/admin/kpi-compute";
import { getPageMeta } from "@/lib/admin/page-tabs-config";

export function AdminSettingsChrome({ children }: { children: ReactNode }) {
  const meta = getPageMeta("settings");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? meta.defaultTab;
  const kpis = computePageKpis("settings", {});

  const setActiveTab = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 pb-8">
      <AdminPageHeader pageId="settings" />
      <KPIGrid metrics={kpis} />
      <AdminTabs tabs={meta.tabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
