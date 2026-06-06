import { ArrowRight, CheckCircle2, Clock3, CreditCard, Package, Truck } from "lucide-react";

type Order = {
  status?: string | null;
  paymentStatus?: string | null;
};

const STAGES = [
  { key: "pending", label: "Order Placed", icon: Clock3, tone: "bg-amber-500/10 text-amber-600" },
  { key: "paid", label: "Payment", icon: CreditCard, tone: "bg-blue-500/10 text-blue-600" },
  { key: "tailoring", label: "Production", icon: Package, tone: "bg-purple-500/10 text-purple-600" },
  { key: "shipped", label: "Shipped", icon: Truck, tone: "bg-emerald-500/10 text-emerald-600" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, tone: "bg-primary/10 text-primary" },
] as const;

export function AdminWorkflowPipeline({ orders }: { orders: Order[] }) {
  const counts = {
    pending: orders.filter((order) => order.status === "pending").length,
    paid: orders.filter((order) => order.paymentStatus === "paid").length,
    tailoring: orders.filter((order) => order.status === "tailoring" || order.status === "quality_check").length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    delivered: orders.filter((order) => order.status === "delivered" || order.status === "picked_up").length,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-heading text-xl font-semibold text-slate-950">Order Pipeline</h2>
        <p className="mt-1 text-sm text-slate-700">A quick operational read on where orders are sitting right now.</p>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex shrink-0 items-center gap-2">
              <div className={`min-w-[112px] rounded-xl px-4 py-3 text-center ${stage.tone}`}>
                <Icon className="mx-auto mb-1 h-5 w-5" />
                <p className="text-xl font-bold text-slate-950">{counts[stage.key]}</p>
                <p className="mt-0.5 text-xs text-slate-700">{stage.label}</p>
              </div>
              {index < STAGES.length - 1 ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
