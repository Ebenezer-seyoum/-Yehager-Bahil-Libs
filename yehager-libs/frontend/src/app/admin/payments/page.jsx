import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminPaymentsTable } from "@/components/admin-payments-table";
import { PaymentsOverviewCards } from "@/components/payments-overview-cards";

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/payments");
  if (session.user.role !== "admin") redirect("/");

  let orders = [];
  let alerts = [];
  let products = [];
  let users = [];

  try {
    const [ordersResponse, alertsResponse, productsResponse, usersResponse] = await Promise.all([
      apiRequest("/api/v1/orders?limit=200"),
      apiRequest("/api/v1/admin/alerts?limit=200"),
      apiRequest("/api/v1/admin/products?limit=200"),
      apiRequest("/api/v1/admin/users?limit=200"),
    ]);

    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    alerts = Array.isArray(alertsResponse?.data) ? alertsResponse.data : [];
    products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  } catch {
    orders = [];
    alerts = [];
    products = [];
    users = [];
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-9 pb-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">Payment attention</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">
          {orders.filter((order) => order.paymentStatus === "awaiting_verification").length} payment(s) awaiting verification
        </h1>
        <p className="mt-1 text-sm text-red-800">
          Open each proof, confirm the transfer, then approve or reject while the status is still awaiting verification.
        </p>
      </div>
      <PaymentsOverviewCards orders={orders} alerts={alerts} products={products} users={users} />
      <AdminPaymentsTable initialOrders={orders} />
    </div>
  );
}
