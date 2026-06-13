import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminUploadedDesignsWorkspace } from "@/components/admin/pages/admin-uploaded-designs-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminUploadedDesignsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/uploaded-designs");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "uploaded_designs.view")) {
    return <AccessRestricted requiredPermission="uploaded_designs.view" sectionName="Uploaded Designs" />;
  }

  let uploadedDesigns = [];
  try {
    const response = await apiRequest("/api/v1/uploaded-designs/admin?limit=200");
    uploadedDesigns = Array.isArray(response?.data) ? response.data : [];
  } catch {
    uploadedDesigns = [];
  }

  return <AdminUploadedDesignsWorkspace data={{ uploadedDesigns }} />;
}
