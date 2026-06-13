"use client";

import { AdminExchangeRatePanel } from "@/components/admin-exchange-rate-panel";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export function AdminExchangeWorkspace({
  exchangeRate,
  canEdit,
}: {
  exchangeRate: Parameters<typeof AdminExchangeRatePanel>[0]["exchangeRate"];
  canEdit: boolean;
}) {
  return (
    <AdminWorkspace pageId="exchange-rate" initialData={{}} hideFilters hideKpis>
      {() => <AdminExchangeRatePanel exchangeRate={exchangeRate} canEdit={canEdit} />}
    </AdminWorkspace>
  );
}
