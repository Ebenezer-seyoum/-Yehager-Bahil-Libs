"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { computePageKpis } from "@/lib/admin/kpi-compute";
import { getPageMeta } from "@/lib/admin/page-tabs-config";

export function AdminSettingsChrome({ children }: { children: ReactNode }) {
  const meta = getPageMeta("settings");
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = useSearchParams()!;
  const pricingPage = pathname.endsWith("/pricing-rules");
  const activeTab = pricingPage ? "pricing" : (searchParams.get("tab") ?? meta.defaultTab);
  // KPIs removed from settings chrome

  const setActiveTab = useCallback(
    (tabId: string) => {
      if (tabId === "pricing") {
        router.push("/admin/settings/pricing-rules");
        return;
      }
      if (pricingPage) {
        router.push(`/admin/settings?tab=${encodeURIComponent(tabId)}`);
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, pricingPage, router, searchParams],
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 pb-8">
      <AdminPageHeader pageId="settings" />
      <AdminTabs tabs={meta.tabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
