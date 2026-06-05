import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { CustomerDetailClient } from "@/components/admin/customer-detail-client";

export default async function AdminCustomerDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const backTab = typeof query.tab === "string" ? query.tab : "all";

  let customer = null;
  let orders = [];
  try {
    const [customerResponse, ordersResponse] = await Promise.all([
      apiRequest(`/api/v1/admin/users/${id}`),
      apiRequest("/api/v1/orders?limit=200"),
    ]);
    customer = customerResponse?.data?.user ?? customerResponse?.data ?? null;
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch {
    customer = null;
    orders = [];
  }
  if (!customer || String(customer.role ?? "").toLowerCase() !== "customer") redirect("/admin/customers");

  return <CustomerDetailClient initialCustomer={customer} orders={orders} backTab={backTab} />;
}
