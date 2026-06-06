"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Search, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
  info: { icon: Info, classes: "border-blue-400/20 bg-blue-400/10 text-blue-500" },
  warning: { icon: AlertTriangle, classes: "border-amber-400/20 bg-amber-400/10 text-amber-500" },
  error: { icon: XCircle, classes: "border-red-400/20 bg-red-400/10 text-red-500" },
  critical: { icon: XCircle, classes: "border-red-600/20 bg-red-600/10 text-red-600" },
};

export function AdminAlertsPanel({ initialAlerts }: { initialAlerts: Alert[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const unresolved = useMemo(() => alerts.filter((alert) => !alert.isResolved), [alerts]);
  const resolved = useMemo(() => alerts.filter((alert) => alert.isResolved), [alerts]);
  const filteredUnresolved = useMemo(() => filterAlerts(unresolved, search, severity), [search, severity, unresolved]);
  const filteredResolved = useMemo(() => filterAlerts(resolved, search, severity), [resolved, search, severity]);

  async function resolveAlert(alertId: string) {
    setBusyId(alertId);
    try {
      const res = await fetch(`/api/backend/admin/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: true }),
      });
      if (!res.ok) throw new Error("Could not resolve alert");
      const payload = (await res.json()) as { data?: Alert };
      if (payload.data) {
        setAlerts((current) => current.map((alert) => (alert.id === alertId ? payload.data! : alert)));
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function renderAlert(alert: Alert) {
    const config = severityStyles[(alert.severity as keyof typeof severityStyles) ?? "info"] ?? severityStyles.info;
    const Icon = config.icon;
    return (
      <div key={alert.id} className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${config.classes} ${alert.isResolved ? "opacity-60" : ""}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 text-foreground">
          <p className="font-medium">{alert.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {alert.type?.replaceAll("_", " ") ?? "system"} · {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "—"}
          </p>
        </div>
        {!alert.isResolved ? (
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void resolveAlert(alert.id)}
            className="rounded-xl border border-green-200 bg-white/80 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-60"
            title="Mark resolved"
          >
            Resolve
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Active alerts</p>
          <p className="mt-2 text-3xl font-black text-red-600">{unresolved.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Critical</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{alerts.filter((alert) => alert.severity === "critical").length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Resolved</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{resolved.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alerts..."
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

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-semibold">
          {unresolved.length > 0 ? <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> : null}
          Active Alerts ({unresolved.length})
        </h2>
        <div className="space-y-3">
          {filteredUnresolved.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-600" />
              No active alerts match this view.
            </div>
          ) : filteredUnresolved.map(renderAlert)}
        </div>
      </section>
      {filteredResolved.length > 0 ? (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold text-muted-foreground">Resolved ({resolved.length})</h2>
          <div className="space-y-2">{filteredResolved.slice(0, 10).map(renderAlert)}</div>
        </section>
      ) : null}
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
