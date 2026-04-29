import { TrendingUp, ShoppingBag, Users, DollarSign, Package, AlertTriangle } from "lucide-react";

export default function MetricsOverview({ orders, products, alerts }) {
  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const activeAlerts = alerts.filter(a => !a.is_resolved).length;
  const lowStock = products.filter(p => !p.is_active).length;
  const avgOrder = orders.length > 0 ? totalRevenue / orders.filter(o => o.payment_status === "paid").length || 0 : 0;
  const paidOrders = orders.filter(o => o.payment_status === "paid").length;

  const metrics = [
    { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Orders", value: orders.length, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Paid Orders", value: paidOrders, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Avg Order Value", value: `$${avgOrder.toFixed(2)}`, icon: DollarSign, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Pending Orders", value: pendingOrders, icon: Package, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Active Alerts", value: activeAlerts, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
            <m.icon className={`w-4 h-4 ${m.color}`} />
          </div>
          <p className="text-2xl font-bold">{m.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}