import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { CustomerDetailClient } from "@/components/admin/customer-detail-client";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { backTab?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/admin/customers/${params.id}`);
  if (session.user.role !== "admin") redirect("/admin/customers");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookie = `next-auth.session-token=${(session.user as any).accessToken || ""}`;

  // Fetch customer and orders in parallel
  const [customerRes, ordersRes] = await Promise.all([
    fetch(`${baseUrl}/api/backend/admin/users/${params.id}`, { headers: { Cookie: cookie } }).catch(() => null),
    fetch(`${baseUrl}/api/backend/admin/orders`, { headers: { Cookie: cookie } }).catch(() => null),
  ]);

  const customerData = customerRes && customerRes.ok ? await customerRes.json() : null;
  const ordersData = ordersRes && ordersRes.ok ? await ordersRes.json() : { orders: [] };

  if (!customerData?.data) {
    redirect("/admin/customers");
  }

  const customer = customerData.data.user || customerData.data;

  return (
    <CustomerDetailClient
      initialCustomer={customer}
      orders={ordersData.orders || []}
      backTab={searchParams.backTab}
    />
  );
}
