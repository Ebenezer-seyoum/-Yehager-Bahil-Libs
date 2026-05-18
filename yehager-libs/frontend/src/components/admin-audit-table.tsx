"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type AuditLog = {
  id: string;
  action: string;
  category: string;
  severity: string;
  entityType?: string | null;
  entityId?: string | null;
  performedBy?: string | null;
  details?: string | null;
  createdAt?: string | null;
};

const categories = ["order", "inventory", "payment", "shipping", "customer", "system", "admin"];

export function AdminAuditTable({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !needle ||
        [log.action, log.performedBy, log.details]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesCategory = category === "all" || log.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [logs, search, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search logs..."
            className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-4 text-sm"
          />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-5 text-muted-foreground">
                  No logs found.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{log.action}</p>
                    {log.details ? <p className="truncate text-xs text-muted-foreground">{log.details}</p> : null}
                  </td>
                  <td className="px-4 py-3">{log.category}</td>
                  <td className="px-4 py-3">{log.severity}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {log.entityType ?? "—"} {log.entityId ? log.entityId.slice(0, 8) : ""}
                  </td>
                  <td className="px-4 py-3">{log.performedBy ?? "system"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
