import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { EmployeeDetailClient } from "@/components/admin/employee-detail-client";

export default async function EmployeeDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;

  let payload = null;
  try {
    const response = await apiRequest(`/api/backend/admin/users/${id}`);
    payload = response?.data ?? null;
  } catch {
    payload = null;
  }

  if (!payload) redirect("/admin/users");

  return (
    <EmployeeDetailClient
      initialPayload={payload}
      backTab="all"
      canAssignRole={session.user.role === "admin"}
      canEdit={session.user.role === "admin"}
      canUpdateStatus={session.user.role === "admin"}
      canDelete={session.user.role === "admin"}
      currentUserId={session.user.id}
    />
  );
}
