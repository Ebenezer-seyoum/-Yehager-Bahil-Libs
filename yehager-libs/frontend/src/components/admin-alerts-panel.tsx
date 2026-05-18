"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
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
  const unresolved = useMemo(() => alerts.filter((alert) => !alert.isResolved), [alerts]);
  const resolved = useMemo(() => alerts.filter((alert) => alert.isResolved), [alerts]);

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
      <div key={alert.id} className={`flex items-start gap-3 rounded-xl border p-4 ${config.classes} ${alert.isResolved ? "opacity-60" : ""}`}>
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
            className="rounded-md p-1 hover:bg-background/70 disabled:opacity-60"
            title="Mark resolved"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-semibold">
          {unresolved.length > 0 ? <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> : null}
          Active Alerts ({unresolved.length})
        </h2>
        <div className="space-y-3">
          {unresolved.length === 0 ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No active alerts.</div> : unresolved.map(renderAlert)}
        </div>
      </section>
      {resolved.length > 0 ? (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold text-muted-foreground">Resolved ({resolved.length})</h2>
          <div className="space-y-2">{resolved.slice(0, 10).map(renderAlert)}</div>
        </section>
      ) : null}
    </div>
  );
}
