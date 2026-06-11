import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminDocumentDetailWorkspace } from "@/components/admin/pages/admin-document-detail-workspace";

export const metadata = {
  title: "Document Details — Admin Dashboard",
  description: "View and manage order documents and fulfillment details.",
};

export default async function AdminDocumentDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/documents");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? response ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders/documents");

  return <AdminDocumentDetailWorkspace initialData={{ orders: [order] }} orderId={id} />;
}
