import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminDocumentsWorkspace } from "@/components/admin/pages/admin-documents-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminOrderDocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/documents");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "documents.view")) {
    return <AccessRestricted requiredPermission="documents.view" sectionName="Order Documents" />;
  }

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return <AdminDocumentsWorkspace data={{ orders }} />;
}
