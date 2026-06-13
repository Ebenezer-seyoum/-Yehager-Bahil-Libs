import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { CustomerDetailClient } from "@/components/admin/customer-detail-client";

export default async function AdminCustomerDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "customers.view")) {
    return <AccessRestricted requiredPermission="customers.view" sectionName="Customer detail" />;
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const backTab = typeof query.backTab === "string" ? query.backTab : (typeof query.tab === "string" ? query.tab : "all");

  let customer = null;
  let orders = [];
  try {
    const customerResponse = await apiRequest(`/api/v1/admin/customers/${id}`);
    customer = customerResponse?.data?.user ?? customerResponse?.data ?? null;
    if (can(session.user.permissions, "orders.view")) {
      const ordersResponse = await apiRequest("/api/v1/orders?limit=200");
      orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    }
  } catch (err) {
    console.error("Failed fetching customer/orders in customer page:", err);
    customer = null;
    orders = [];
  }
  if (!customer || String(customer.role ?? "").toLowerCase() !== "customer") redirect("/admin/customers");

  return (
    <CustomerDetailClient
      initialCustomer={customer}
      orders={orders}
      backTab={backTab}
      canEdit={can(session.user.permissions, "customers.edit")}
      canDelete={can(session.user.permissions, "customers.delete")}
    />
  );
}
