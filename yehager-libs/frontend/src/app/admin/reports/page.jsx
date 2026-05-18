import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminRevenueCharts } from "@/components/admin-revenue-charts";

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  return params.toString();
}

export default async function AdminReportsPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/reports");
  if (session.user.role !== "admin") redirect("/");

  const query = (await searchParams) ?? {};
  const filters = {
    status: query.status ?? "",
    paymentStatus: query.paymentStatus ?? "",
    customer: query.customer ?? "",
    country: query.country ?? "",
  };
  const queryString = buildQuery(filters);

  let report = { rows: [], summary: { totalOrders: 0, paidOrders: 0, pendingOrders: 0, totalRevenue: 0 } };
  try {
    const response = await apiRequest(`/api/v1/admin/reports/orders${queryString ? `?${queryString}` : ""}`);
    report = response?.data ?? report;
  } catch {
    report = { rows: [], summary: { totalOrders: 0, paidOrders: 0, pendingOrders: 0, totalRevenue: 0 } };
  }

  const csvHref = `/api/backend/admin/reports/orders/export?${buildQuery({ ...filters, format: "csv" })}`;
  const pdfHref = `/api/backend/admin/reports/orders/export?${buildQuery({ ...filters, format: "pdf" })}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Insights</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter orders by status, payment state, customer, or country and export the exact result set you are viewing.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <select name="status" defaultValue={filters.status} className="h-11 rounded-xl border border-input bg-background px-3">
          <option value="">All statuses</option>
          {["pending", "processing", "tailoring", "quality_check", "shipped", "delivered", "picked_up", "cancelled"].map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select name="paymentStatus" defaultValue={filters.paymentStatus} className="h-11 rounded-xl border border-input bg-background px-3">
          <option value="">All payments</option>
          {["pending", "paid", "failed", "refunded", "unpaid"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input name="customer" defaultValue={filters.customer} placeholder="Customer name or email" className="h-11 rounded-xl border border-input bg-background px-3" />
        <input name="country" defaultValue={filters.country} placeholder="Country" className="h-11 rounded-xl border border-input bg-background px-3" />
        <div className="md:col-span-4 flex flex-wrap gap-3">
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Apply filters</button>
          <a href="/admin/reports" className="rounded-xl border border-border px-4 py-2 text-sm">
            Reset
          </a>
          <a href={csvHref} className="rounded-xl border border-border px-4 py-2 text-sm">
            Download Excel-compatible CSV
          </a>
          <a href={pdfHref} className="rounded-xl border border-border px-4 py-2 text-sm">
            Download PDF
          </a>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Orders", report.summary.totalOrders],
          ["Paid orders", report.summary.paidOrders],
          ["Pending orders", report.summary.pendingOrders],
          ["Revenue", formatCurrency(report.summary.totalRevenue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <AdminRevenueCharts orders={report.rows} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-5 text-muted-foreground">
                  No report rows found.
                </td>
              </tr>
            ) : (
              report.rows.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p>{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{order.status?.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{order.paymentStatus}</td>
                  <td className="px-4 py-3">{order.shippingAddress?.country ?? "—"}</td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(order.totalUsd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
