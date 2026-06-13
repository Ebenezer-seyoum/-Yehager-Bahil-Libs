import { apiRequest } from "@/lib/api-client";
import { requireEmployeePageAccess } from "@/lib/employee-access";

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

type EmployeeOrder = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  totalUsd?: string | number | null;
  status?: string | null;
  fulfillmentType?: string | null;
};

export default async function EmployeeOrdersPage() {
  await requireEmployeePageAccess("/employee/orders", "orders.view");

  let orders: EmployeeOrder[] = [];
  try {
    const response = await apiRequest<{ data?: EmployeeOrder[] }>("/api/v1/orders?limit=100");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Employee</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational order queue for daily fulfillment work.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{order.orderNumber ?? order.id}</td>
                  <td className="px-4 py-3">{order.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(order.totalUsd)}</td>
                  <td className="px-4 py-3">{order.status ?? "pending"}</td>
                  <td className="px-4 py-3">{order.fulfillmentType ?? "mail"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
