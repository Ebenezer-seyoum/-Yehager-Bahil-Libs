import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminDocumentDetailWorkspace } from "@/components/admin/pages/admin-document-detail-workspace";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

export const metadata = {
  title: "Document Details — Admin Dashboard",
  description: "View and manage order documents and fulfillment details.",
};

export default async function AdminDocumentDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/documents");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "documents.view")) {
    return <AccessRestricted requiredPermission="documents.view" sectionName="Order Documents" />;
  }

  const { id } = await params;

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? response ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders/documents");

  const isAdmin = session.user.role === "admin";
  return (
    <AdminDocumentDetailWorkspace
      initialData={{ orders: [order] }}
      orderId={id}
      capabilities={{
        upload: isAdmin || can(session.user.permissions, "documents.upload"),
        update: isAdmin || can(session.user.permissions, "documents.update"),
        delete: isAdmin || can(session.user.permissions, "documents.delete"),
        download: isAdmin || can(session.user.permissions, "documents.download"),
      }}
    />
  );
}
