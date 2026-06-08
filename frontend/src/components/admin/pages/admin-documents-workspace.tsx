"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AdminOrderDocumentsManager } from "@/components/admin-order-documents-manager";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminDocumentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const orders = (data.orders ?? []) as Parameters<typeof AdminOrderDocumentsManager>[0]["initialOrders"];

  function SearchResultBadge({ query }: { query: string }) {
    const [finished, setFinished] = useState(false);
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
      setFinished(false);
      if (!query || !query.trim()) {
        setCount(null);
        const t = setTimeout(() => setFinished(false), 300);
        return () => clearTimeout(t);
      }
      const handler = setTimeout(() => {
        const q = query.trim().toLowerCase();
        const matches = orders.filter((order) =>
          [order.id, order.orderNumber, order.userName, order.userEmail, order.status, order.paymentStatus]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        ).length;
        setCount(matches);
        setFinished(true);
      }, 400);
      return () => clearTimeout(handler);
    }, [query]);

    if (!finished || count == null || !query.trim()) return null;
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-700" aria-live="polite">
        <SearchIcon className="h-4 w-4 text-primary" />
        <span className="font-medium">{count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">results</span>
      </div>
    );
  }

  return (
    <AdminWorkspace
      pageId="documents"
      initialData={data}
      hideKpis
      filterPlaceholder="Search documents by order, customer, or email..."
      filterActions={({ search }) => (
        <div className="flex items-center gap-3 w-full">
          <SearchResultBadge query={search} />
        </div>
      )}
    >
      {({ search }) => (
        <AdminOrderDocumentsManager
          initialOrders={(data.orders ?? []) as Parameters<typeof AdminOrderDocumentsManager>[0]["initialOrders"]}
          externalSearch={search}
        />
      )}
    </AdminWorkspace>
  );
}
