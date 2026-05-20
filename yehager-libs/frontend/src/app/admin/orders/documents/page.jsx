import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOrderDocumentsManager } from "@/components/admin-order-documents-manager";

export default async function AdminOrderDocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/documents");
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
        <h1 className="mt-2 font-heading text-3xl font-semibold">Order Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage pickup IDs, signed pickup forms, pickup proof, ETB payment proof review, and shipping paperwork.
        </p>
      </div>

      <AdminOrderDocumentsManager initialOrders={orders} />
    </div>
  );
}
