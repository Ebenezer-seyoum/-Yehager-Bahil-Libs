import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-600/10 border-red-600/20" },
};

export default function AlertsPanel({ alerts, onRefresh }) {
  const unresolved = alerts.filter(a => !a.is_resolved);
  const resolved = alerts.filter(a => a.is_resolved);

  const resolve = async (alertId) => {
    await base44.entities.SystemAlert.update(alertId, { is_resolved: true, resolved_by: "admin" });
    onRefresh();
  };

  const renderAlert = (alert) => {
    const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
    const Icon = cfg.icon;
    return (
      <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${alert.is_resolved ? "opacity-50" : ""}`}>
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(alert.created_date).toLocaleString()} · {alert.type?.replace("_", " ")}
          </p>
        </div>
        {!alert.is_resolved && (
          <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0" onClick={() => resolve(alert.id)}>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          Active Alerts ({unresolved.length})
        </h3>
        <div className="space-y-3">
          {unresolved.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No active alerts 🎉</div>
          ) : unresolved.map(renderAlert)}
        </div>
      </div>
      {resolved.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-muted-foreground">Resolved ({resolved.length})</h3>
          <div className="space-y-2">{resolved.slice(0, 10).map(renderAlert)}</div>
        </div>
      )}
    </div>
  );
}