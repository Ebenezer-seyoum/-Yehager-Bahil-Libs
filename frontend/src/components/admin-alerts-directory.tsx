"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  ADMIN_TABLE_WRAPPER,
} from "@/lib/admin/admin-design-system";
import { dashboardSuccess, dashboardError } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  severity?: string | null;
  isResolved?: boolean | null;
  createdAt?: string | null;
};

function severityTone(severity?: string | null): "success" | "pending" | "danger" | "info" | "neutral" {
  const s = String(severity ?? "info").toLowerCase();
  if (s === "critical" || s === "error") return "danger";
  if (s === "warning") return "pending";
  return "info";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminAlertsDirectory({
  alerts,
  search,
}: {
  alerts: Alert[];
  search: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localAlerts, setLocalAlerts] = useState(alerts);

  useEffect(() => {
    setLocalAlerts(alerts);
  }, [alerts]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return localAlerts;
    return localAlerts.filter((alert) =>
      [alert.title, alert.message, alert.type, alert.severity]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(needle)),
    );
  }, [localAlerts, search]);

  async function resolveAlert(alertId: string) {
    setBusyId(alertId);
    try {
      const res = await fetch(`/api/backend/admin/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: true }),
      });
      if (!res.ok) throw new Error("Could not mark notification as read");
      const payload = (await res.json()) as { data?: Alert };
      if (payload.data) {
        setLocalAlerts((current) => current.map((alert) => (alert.id === alertId ? payload.data! : alert)));
      }
      void dashboardSuccess("Marked Read", "Notification marked as read.");
      router.refresh();
    } catch (e) {
      void dashboardError("Could not mark read", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={ADMIN_TABLE_WRAPPER}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell className="w-14">No</TableHeadCell>
              <TableHeadCell>Alert</TableHeadCell>
              <TableHeadCell>Type</TableHeadCell>
              <TableHeadCell>Severity</TableHeadCell>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell className="w-[7.5rem]">Actions</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No notifications match this view.
                </td>
              </tr>
            ) : (
              filtered.map((alert, index) => {
                const isUnread = !alert.isResolved;
                return (
                <tr key={alert.id} className={cn("border-t border-border transition hover:bg-blue-50/40", isUnread ? "border-l-4 border-l-blue-500 bg-blue-50/60" : "")}>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
                      <p className="font-semibold text-slate-950">{alert.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{alert.message}</p>
                  </td>
                  <td className="px-4 py-4 capitalize text-slate-700">
                    {String(alert.type ?? "system").replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={String(alert.severity ?? "info")} tone={severityTone(alert.severity)} />
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(alert.createdAt)}</td>
                  <td className="px-4 py-4">
                    {!alert.isResolved ? (
                      <DashboardTableActions>
                        <DashboardActionButton
                          action="approve"
                          onClick={() => void resolveAlert(alert.id)}
                          disabled={busyId !== null}
                        >
                          Mark read
                        </DashboardActionButton>
                      </DashboardTableActions>
                    ) : (
                      <StatusBadge value="Read" tone="success" />
                    )}
                  </td>
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
