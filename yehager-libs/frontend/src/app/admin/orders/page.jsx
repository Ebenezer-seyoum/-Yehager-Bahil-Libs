import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { BellRing, CheckCircle2, ClipboardList, CreditCard, ShoppingCart } from "lucide-react";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOrdersTable } from "@/components/admin-orders-table";

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders");
  if (session.user.role !== "admin") redirect("/");

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  const cards = [
    {
      label: "Total orders",
      value: orders.length,
      helper: "All records",
      tone: "from-slate-800 to-blue-700",
      icon: ShoppingCart,
    },
    {
      label: "Needs review",
      value: orders.filter((order) => order.status === "pending" || order.paymentStatus === "awaiting_verification").length,
      helper: "New orders and payment proofs",
      tone: "from-rose-800 to-rose-600",
      icon: BellRing,
    },
    {
      label: "Payment proofs",
      value: orders.filter((order) => order.paymentStatus === "awaiting_verification").length,
      helper: "Awaiting verification",
      tone: "from-amber-700 to-orange-600",
      icon: CreditCard,
    },
    {
      label: "Active orders",
      value: orders.filter((order) => !["delivered", "picked_up", "cancelled"].includes(order.status ?? "")).length,
      helper: "Still in operation",
      tone: "from-teal-800 to-emerald-700",
      icon: ClipboardList,
    },
    {
      label: "Completed",
      value: orders.filter((order) => ["delivered", "picked_up"].includes(order.status ?? "")).length,
      helper: "Finished orders",
      tone: "from-emerald-800 to-emerald-600",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Operations</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, search, and update operational order states.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`group rounded-3xl bg-gradient-to-br ${card.tone} p-5 text-left text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/10`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">{card.label}</p>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-white">{card.value}</p>
                  <p className="mt-2 text-sm font-medium text-white/82">{card.helper}</p>
                </div>
                <span className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
