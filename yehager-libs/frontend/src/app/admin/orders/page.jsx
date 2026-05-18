import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminWorkflowPipeline } from "@/components/admin-workflow-pipeline";
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Operations</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, search, and update operational order states.</p>
      </div>
      <AdminWorkflowPipeline orders={orders} />
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
