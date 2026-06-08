"use client";

import { AdminExchangeRatePanel } from "@/components/admin-exchange-rate-panel";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export function AdminExchangeWorkspace({
  exchangeRate,
}: {
  exchangeRate: Parameters<typeof AdminExchangeRatePanel>[0]["exchangeRate"];
}) {
  return (
    <AdminWorkspace pageId="exchange-rate" initialData={{}} hideFilters hideKpis>
      {() => <AdminExchangeRatePanel exchangeRate={exchangeRate} />}
    </AdminWorkspace>
  );
}
