import { ArrowRight, CreditCard, Package, Truck, CheckCircle, Clock } from "lucide-react";

const STAGES = [
  { key: "pending", label: "Order Placed", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { key: "paid", label: "Payment", icon: CreditCard, color: "text-blue-400", bg: "bg-blue-400/10" },
  { key: "tailoring", label: "Production", icon: Package, color: "text-purple-400", bg: "bg-purple-400/10" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "text-green-400", bg: "bg-green-400/10" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
];

export default function WorkflowPipeline({ orders }) {
  const counts = {
    pending: orders.filter(o => o.status === "pending").length,
    paid: orders.filter(o => o.payment_status === "paid").length,
    tailoring: orders.filter(o => o.status === "tailoring" || o.status === "quality_check").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-5">Order Pipeline</h3>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const count = counts[stage.key] || 0;
          return (
            <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
              <div className={`${stage.bg} rounded-xl px-4 py-3 text-center min-w-[100px]`}>
                <Icon className={`w-5 h-5 ${stage.color} mx-auto mb-1`} />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stage.label}</p>
              </div>
              {i < STAGES.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}