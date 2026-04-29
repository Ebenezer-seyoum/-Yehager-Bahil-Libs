import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Scissors, CheckCircle2, Truck, Star, Clock, ChevronRight, MapPin } from "lucide-react";

const STAGES = [
  { key: "pending",       label: "Order Received",     icon: Package,       desc: "Your order is confirmed and queued for production in Addis Ababa.",   daysOffset: 0,  daysRange: 0  },
  { key: "tailoring",     label: "In Tailoring",       icon: Scissors,      desc: "Master artisans are cutting, embroidering and stitching your garment.",daysOffset: 2,  daysRange: 20 },
  { key: "quality_check", label: "Quality Inspected",  icon: CheckCircle2,  desc: "Every measurement, stitch, and embroidery detail is being verified.",  daysOffset: 22, daysRange: 5  },
  { key: "shipped",       label: "Shipped",             icon: Truck,         desc: "Your garment has been dispatched via DHL/UPS. Tracking sent by email.",daysOffset: 27, daysRange: 14 },
  { key: "delivered",     label: "Delivered",           icon: Star,          desc: "Your garment has arrived. Wear your culture with pride!",              daysOffset: 41, daysRange: 0  },
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function OrderTimeline({ order }) {
  const currentIdx = STAGE_INDEX[order.status] ?? 0;
  const orderDate = new Date(order.created_date);
  const estDelivery = addDays(orderDate, 41);
  const today = new Date();
  const daysLeft = Math.max(0, Math.round((estDelivery - today) / 86400000));

  return (
    <div className="p-5 sm:p-6 bg-card rounded-2xl border border-border">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-foreground">{order.order_number}</span>
            {order.event_name && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {order.event_name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {order.items?.length} item(s) · <span className="font-semibold text-foreground">${order.total?.toFixed(2)}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ordered {fmtDate(order.created_date)}
          </p>
        </div>
        <div className="text-right shrink-0">
          {order.status === "delivered" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold">
              <Star className="w-3 h-3" /> Delivered
            </span>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Est. delivery</p>
              <p className="text-xs font-bold text-foreground">{fmtDate(estDelivery)}</p>
              {daysLeft > 0 && <p className="text-[11px] text-primary font-medium">{daysLeft} days remaining</p>}
            </>
          )}
        </div>
      </div>

      {/* Timeline — vertical on mobile, horizontal on sm+ */}
      <div className="hidden sm:block relative">
        {/* Track */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-700"
          style={{ width: `calc(${(currentIdx / (STAGES.length - 1)) * 100}% - 0px)` }}
        />
        <div className="relative flex justify-between">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const done = i < currentIdx;
            const active = i === currentIdx;
            const stageDate = addDays(orderDate, stage.daysOffset);
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "bg-primary/15 border-primary text-primary animate-pulse"
                  : "bg-background border-border text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`text-[10px] font-semibold text-center leading-tight ${
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}>{stage.label}</p>
                <p className={`text-[9px] text-center ${
                  done || active ? "text-muted-foreground" : "text-border"
                }`}>
                  {done ? `✓ ${fmtDate(stageDate)}` : active ? "In progress" : fmtDate(stageDate)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="sm:hidden space-y-0">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          const stageDate = addDays(orderDate, stage.daysOffset);
          return (
            <div key={stage.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                  done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "bg-primary/15 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${ done ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p className={`text-xs font-semibold ${ active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                  {stage.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {done ? `✓ ${fmtDate(stageDate)}` : active ? "In progress" : `Est. ${fmtDate(stageDate)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active stage highlight */}
      <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
          {(() => { const Icon = STAGES[currentIdx]?.icon; return Icon ? <Icon className="w-3.5 h-3.5" /> : null; })()} 
          Current Stage: {STAGES[currentIdx]?.label}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{STAGES[currentIdx]?.desc}</p>
      </div>

      {/* Items */}
      <div className="mt-4 space-y-1">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{item.product_name}</span>
            <span className="ml-auto">${item.price?.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Shipping */}
      {order.shipping_address?.street && (
        <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Shipping to: {order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.country}</span>
        </div>
      )}
    </div>
  );
}

export default function TailoringStatus() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { setLoading(false); return; }
      const me = await base44.auth.me();
      setUser(me);
      const ords = await base44.entities.Order.filter({ user_email: me.email }, "-created_date", 50);
      setOrders(ords);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h2 className="font-heading text-2xl font-bold mb-2">Sign in to track your garments</h2>
      <p className="text-muted-foreground text-sm mb-6">View real-time production and shipping status for all your orders.</p>
      <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link to="/my-orders" className="hover:text-foreground">Account</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Tailoring Status</span>
        </div>
        <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-2">Live Tracking</p>
        <h1 className="font-heading text-4xl font-bold">My Tailoring Status</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Real-time progress of your custom-made garments — from the artisan's needle to your door.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {STAGES.slice(0, 4).map((stage) => {
          const count = orders.filter((o) => o.status === stage.key).length;
          const Icon = stage.icon;
          return (
            <button
              key={stage.key}
              onClick={() => setFilter(filter === stage.key ? "all" : stage.key)}
              className={`p-4 rounded-xl border text-left transition-all ${filter === stage.key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
            >
              <Icon className={`w-5 h-5 mb-2 ${filter === stage.key ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-xl font-bold font-heading">{count}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{stage.label}</p>
            </button>
          );
        })}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <Scissors className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">
            {filter === "all" ? "No orders yet" : `No orders in "${STAGES.find(s => s.key === filter)?.label}" stage`}
          </h3>
          {filter === "all" ? (
            <><p className="text-muted-foreground text-sm mb-4">Browse the collection and place your first order.</p>
            <Button asChild size="sm"><Link to="/catalog">Browse Collection</Link></Button></>
          ) : (
            <button onClick={() => setFilter("all")} className="text-sm text-primary hover:underline mt-2">Show all orders</button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((order) => (
            <OrderTimeline key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}