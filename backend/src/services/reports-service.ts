import { listAllOrders } from "../repositories/orders-repository.js";

export type OrderReportFilters = {
  status?: string;
  paymentStatus?: string;
  customer?: string;
  country?: string;
};

function getCountry(order: { shippingAddress?: Record<string, unknown> | null }) {
  const country = order.shippingAddress?.country;
  return typeof country === "string" ? country : "";
}

export async function getOrderReport(filters: OrderReportFilters) {
  const orders = await listAllOrders(500);
  const customerNeedle = filters.customer?.trim().toLowerCase();
  const countryNeedle = filters.country?.trim().toLowerCase();

  const rows = orders.filter((order) => {
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesPayment = !filters.paymentStatus || order.paymentStatus === filters.paymentStatus;
    const matchesCustomer =
      !customerNeedle ||
      [order.customerName, order.userEmail].some((value) => String(value ?? "").toLowerCase().includes(customerNeedle));
    const matchesCountry = !countryNeedle || getCountry(order).toLowerCase().includes(countryNeedle);
    return matchesStatus && matchesPayment && matchesCustomer && matchesCountry;
  });

  const totalRevenue = rows
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0);

  return {
    rows,
    summary: {
      totalOrders: rows.length,
      paidOrders: rows.filter((order) => order.paymentStatus === "paid").length,
      pendingOrders: rows.filter((order) => order.status === "pending").length,
      totalRevenue,
    },
  };
}

export function toOrderReportCsv(rows: Awaited<ReturnType<typeof listAllOrders>>) {
  const header = ["Order Number", "Customer", "Email", "Status", "Payment Status", "Country", "Total USD", "Created At"];
  const lines = rows.map((order) => [
    order.orderNumber,
    order.customerName,
    order.userEmail,
    order.status,
    order.paymentStatus,
    getCountry(order),
    order.totalUsd,
    order.createdAt?.toISOString() ?? "",
  ]);

  return [header, ...lines]
    .map((line) =>
      line
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
