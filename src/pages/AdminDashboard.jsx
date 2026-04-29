import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, ShoppingBag, Package, Bell, ScrollText, 
  RefreshCw, Shield, FolderOpen, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricsOverview from "../components/admin/MetricsOverview";
import OrderManagement from "../components/admin/OrderManagement";
import InventoryManagement from "../components/admin/InventoryManagement";
import AlertsPanel from "../components/admin/AlertsPanel";
import AuditLogPanel from "../components/admin/AuditLogPanel";
import RevenueChart from "../components/admin/RevenueChart";
import WorkflowPipeline from "../components/admin/WorkflowPipeline";
import DocumentsManagement from "../components/admin/DocumentsManagement";
import ExchangeRatePanel from "../components/admin/ExchangeRatePanel";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "documents", label: "Documents & Clothing", icon: FolderOpen },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "exchange", label: "Exchange Rate", icon: TrendingUp },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "logs", label: "Audit Logs", icon: ScrollText },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    const [o, p, a, l, rates] = await Promise.all([
      base44.entities.Order.list("-created_date", 200),
      base44.entities.Product.list("-created_date", 200),
      base44.entities.SystemAlert.list("-created_date", 100),
      base44.entities.AuditLog.list("-created_date", 200),
      base44.entities.ExchangeRate.filter({ currency_pair: "USD_ETB" }),
    ]);
    setOrders(o);
    setProducts(p);
    setAlerts(a);
    setLogs(l);
    setExchangeRate(rates.length > 0 ? rates[0] : null);
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) { navigate("/"); return; }
      const me = await base44.auth.me();
      if (me.role !== "admin") { navigate("/"); return; }
      setUser(me);
      await loadData();
    });
  }, []);

  const unresolvedAlerts = alerts.filter(a => !a.is_resolved).length;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Admin Command Center</h1>
                <p className="text-[10px] text-muted-foreground">Yehager Bahil Libs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unresolvedAlerts > 0 && (
                <button
                  onClick={() => setTab("alerts")}
                  className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full"
                >
                  <Bell className="w-3.5 h-3.5 animate-pulse" />
                  {unresolvedAlerts} alerts
                </button>
              )}
              <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-muted-foreground hidden sm:block">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.id === "alerts" && unresolvedAlerts > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                      {unresolvedAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <MetricsOverview orders={orders} products={products} alerts={alerts} />
            <WorkflowPipeline orders={orders} />
            <RevenueChart orders={orders} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {orders.slice(0, 6).map(o => (
                    <div key={o.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{o.customer_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{o.order_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">${o.total?.toFixed(2)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          o.status === "delivered" ? "bg-green-100 text-green-800" :
                          o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Product Status */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-4">Inventory Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Products</span>
                    <span className="font-bold">{products.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-bold text-green-400">{products.filter(p => p.is_active).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inactive</span>
                    <span className="font-bold text-red-400">{products.filter(p => !p.is_active).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Featured</span>
                    <span className="font-bold text-primary">{products.filter(p => p.is_featured).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Regions</span>
                    <span className="font-bold">{[...new Set(products.map(p => p.region))].length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <OrderManagement orders={orders} onRefresh={loadData} />
        )}

        {tab === "inventory" && (
          <InventoryManagement products={products} onRefresh={loadData} etbRate={exchangeRate?.rate} />
        )}

        {tab === "exchange" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <ExchangeRatePanel rateRecord={exchangeRate} onRefresh={loadData} />
          </div>
        )}

        {tab === "alerts" && (
          <AlertsPanel alerts={alerts} onRefresh={loadData} />
        )}

        {tab === "documents" && (
          <DocumentsManagement orders={orders} onRefresh={loadData} />
        )}

        {tab === "logs" && (
          <AuditLogPanel logs={logs} />
        )}
      </div>
    </div>
  );
}