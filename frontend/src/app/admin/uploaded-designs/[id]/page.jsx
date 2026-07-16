import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { UploadedDesignDetailPage } from "@/components/admin/uploaded-design-detail-page";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminUploadedDesignDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/uploaded-designs");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "uploaded_designs.view")) {
    return <AccessRestricted requiredPermission="uploaded_designs.view" sectionName="Uploaded Design" />;
  }

  const { id } = await params;

  let design = null;
  try {
    const response = await apiRequest(`/api/v1/uploaded-designs/admin/${id}`);
    design = response?.data ?? response ?? null;
  } catch {
    design = null;
  }

  if (!design) redirect("/admin/custom-orders?tab=requests");

  return (
    <UploadedDesignDetailPage
      initialDesign={design}
      backUrl="/admin/custom-orders?tab=requests"
      canReview={session.user.role === "admin" || can(session.user.permissions, "uploaded_designs.review")}
    />
  );
}
