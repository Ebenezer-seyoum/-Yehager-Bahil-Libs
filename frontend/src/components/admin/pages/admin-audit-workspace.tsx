"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AdminAuditTable } from "@/components/admin-audit-table";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export function AdminAuditWorkspace({ data }: { data: AdminWorkspaceData }) {
  const logs = (data.audit ?? []) as Parameters<typeof AdminAuditTable>[0]["logs"];

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
        const matches = logs.filter((log) =>
          [log.action, log.category, log.severity, log.entityType, log.entityId, log.performedBy, log.details]
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
      pageId="activity-logs"
      initialData={data}
      hideKpis
      filterPlaceholder="Search logs by action, category, actor, or details..."
      filterActions={({ search }) => (
        <div className="flex items-center gap-3 w-full">
          <SearchResultBadge query={search} />
        </div>
      )}
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => (
        <AdminAuditTable
          logs={(filteredData.audit ?? []) as Parameters<typeof AdminAuditTable>[0]["logs"]}
          externalSearch={search}
          onFilteredCountChange={setDisplayedRecordsCount}
        />
      )}
    </AdminWorkspace>
  );
}
