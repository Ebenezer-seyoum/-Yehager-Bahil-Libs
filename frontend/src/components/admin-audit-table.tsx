"use client";

import { useEffect, useMemo, useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";
import { AlertTriangle, CheckCircle2, CreditCard, Package, ShieldCheck, Truck, UserRound } from "lucide-react";

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

const categoryConfig = {
  order: { icon: Package, className: "bg-blue-50 text-blue-700" },
  inventory: { icon: Package, className: "bg-emerald-50 text-emerald-700" },
  payment: { icon: CreditCard, className: "bg-purple-50 text-purple-700" },
  shipping: { icon: Truck, className: "bg-cyan-50 text-cyan-700" },
  customer: { icon: UserRound, className: "bg-orange-50 text-orange-700" },
  system: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  admin: { icon: ShieldCheck, className: "bg-slate-100 text-slate-700" },
};

const severityStyles: Record<string, string> = {
  info: "bg-blue-50 text-blue-700",
  low: "bg-slate-100 text-slate-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-rose-50 text-rose-700",
  critical: "bg-rose-100 text-rose-800",
};

export function AdminAuditTable({ logs, externalSearch, onFilteredCountChange }: { logs: AuditLog[]; externalSearch?: string; onFilteredCountChange?: (count: number) => void }) {
  const [search, setSearch] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => {
    const needle = effectiveSearch.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !needle ||
        [log.action, log.performedBy, log.details]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesCategory = category === "all" || log.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [logs, effectiveSearch, category]);

  useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total logs</p>
          <p className="mt-2 text-3xl font-black">{logs.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Payment activity</p>
          <p className="mt-2 text-3xl font-black text-purple-700">{logs.filter((log) => log.category === "payment").length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Warnings</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{logs.filter((log) => ["warning", "error", "critical"].includes(log.severity)).length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row">
        {externalSearch === undefined ? (
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search logs..."
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        ) : null}
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold">
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className={ADMIN_TABLE_WRAPPER}>
        <table className="w-full text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell>Time</TableHeadCell>
              <TableHeadCell>Action</TableHeadCell>
              <TableHeadCell>Category</TableHeadCell>
              <TableHeadCell>Severity</TableHeadCell>
              <TableHeadCell>Entity</TableHeadCell>
              <TableHeadCell>By</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
                  No audit logs match this view.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((log) => {
                const config = categoryConfig[(log.category as keyof typeof categoryConfig) ?? "admin"] ?? categoryConfig.admin;
                const Icon = config.icon;
                return (
                <tr key={log.id} className="border-t border-border transition hover:bg-secondary/35">
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium">{log.action}</p>
                    {log.details ? <p className="truncate text-xs text-muted-foreground">{log.details}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black capitalize ${config.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${severityStyles[log.severity] ?? severityStyles.info}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {log.entityType ?? "—"} {log.entityId ? log.entityId.slice(0, 8) : ""}
                  </td>
                  <td className="px-4 py-3">{log.performedBy ?? "system"}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
