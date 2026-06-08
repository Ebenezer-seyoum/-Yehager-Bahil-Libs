import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { UploadedDesignDetailPage } from "@/components/admin/uploaded-design-detail-page";

export default async function AdminUploadedDesignDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/uploaded-designs");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;

  let design = null;
  try {
    const response = await apiRequest(`/api/v1/uploaded-designs/${id}`);
    design = response?.data ?? response ?? null;
  } catch {
    design = null;
  }

  if (!design) redirect("/admin/uploaded-designs");

  return <UploadedDesignDetailPage initialDesign={design} backUrl="/admin/uploaded-designs" />;
}
