"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Search, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
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

const severityStyles = {
  info: { icon: Info, classes: "border-blue-200 text-blue-600" },
  warning: { icon: AlertTriangle, classes: "border-amber-200 text-amber-600" },
  error: { icon: XCircle, classes: "border-rose-200 text-rose-600" },
  critical: { icon: XCircle, classes: "border-rose-300 text-rose-700" },
};

type StatusFilter = "all" | "new" | "read" | "archived";

export function AdminAlertsPanel({ initialAlerts }: { initialAlerts: Alert[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const unread = useMemo(() => alerts.filter((alert) => !alert.isResolved), [alerts]);
  const read = useMemo(() => alerts.filter((alert) => alert.isResolved), [alerts]);
  const visibleAlerts = useMemo(() => {
    const source = statusFilter === "new" ? unread : statusFilter === "read" ? read : statusFilter === "archived" ? [] : alerts;
    return filterAlerts(source, search, severity);
  }, [alerts, read, search, severity, statusFilter, unread]);

  async function markRead(alertId: string) {
    setBusyId(alertId);
    try {
      const res = await fetch(`/api/backend/admin/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: true }),
      });
      if (!res.ok) throw new Error("Could not mark notification as read.");
      const payload = (await res.json()) as { data?: Alert };
      if (payload.data) {
        setAlerts((current) => current.map((alert) => (alert.id === alertId ? payload.data! : alert)));
      }
      void dashboardSuccess("Marked Read", "Notification marked as read.");
      router.refresh();
    } catch (e) {
      void dashboardError("Update Failed", e instanceof Error ? e.message : "Could not mark notification as read.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllAsRead() {
    if (unread.length === 0) return;
    const confirmed = await dashboardConfirm({
      title: "Mark all as read?",
      text: "All new admin notifications will move to the read list.",
      confirmButtonText: "Yes, mark all",
      cancelButtonText: "Cancel",
      tone: "primary",
      icon: "question",
    });
    if (!confirmed) return;
    setBusyId("all");
    try {
      const res = await fetch("/api/backend/admin/alerts/mark-all-read", { method: "PATCH" });
      if (!res.ok) throw new Error("Could not mark all notifications as read.");
      setAlerts((current) => current.map((alert) => ({ ...alert, isResolved: true })));
      await dashboardSuccess("Notifications Updated", "All notifications have been marked as read.");
      router.refresh();
    } catch (e) {
      await dashboardError("Update Failed", e instanceof Error ? e.message : "Could not mark all notifications as read.");
    } finally {
      setBusyId(null);
    }
  }

  function renderAlert(alert: Alert) {
    const config = severityStyles[(alert.severity as keyof typeof severityStyles) ?? "info"] ?? severityStyles.info;
    const Icon = config.icon;
    return (
      <div
        key={alert.id}
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition",
          alert.isResolved ? "bg-white opacity-75" : "border-l-4 border-l-blue-500 bg-blue-50/70",
          config.classes,
        )}
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 text-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {!alert.isResolved ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
            <p className="font-medium">{alert.title}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {alert.type?.replaceAll("_", " ") ?? "system"} - {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "-"}
          </p>
        </div>
        {!alert.isResolved ? (
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void markRead(alert.id)}
            className="rounded-xl border border-blue-200 bg-white/90 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            title="Mark read"
          >
            Mark read
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">New</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{unread.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Critical</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{alerts.filter((alert) => alert.severity === "critical").length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Read</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{read.length}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All", count: alerts.length },
              { id: "new", label: "New", count: unread.length },
              { id: "read", label: "Read", count: read.length },
              { id: "archived", label: "Archived", count: 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
                  statusFilter === tab.id
                    ? "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-900/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {tab.label}
                <span className={cn("rounded-full px-2 py-0.5 text-xs", statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700")}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={busyId !== null || unread.length === 0}
            className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold">
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-semibold">
          {statusFilter === "new" && unread.length > 0 ? <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> : null}
          Notifications ({visibleAlerts.length})
        </h2>
        <div className="space-y-3">
          {visibleAlerts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
              No notifications match this view.
            </div>
          ) : visibleAlerts.map(renderAlert)}
        </div>
      </section>
    </div>
  );
}

function filterAlerts(alerts: Alert[], search: string, severity: string) {
  const needle = search.trim().toLowerCase();
  return alerts.filter((alert) => {
    const matchesSearch =
      !needle ||
      [alert.title, alert.message, alert.type, alert.severity]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    const matchesSeverity = severity === "all" || alert.severity === severity;
    return matchesSearch && matchesSeverity;
  });
}
