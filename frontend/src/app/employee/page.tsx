import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import {
  employeeAccessBlocked,
  type EmployeeAccessProfile,
} from "@/lib/employee-access";
import { getFirstPermittedAdminRoute } from "@/lib/dashboard-navigation";

export default async function EmployeeEntryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/employee");
  if (session.user.role !== "employee") redirect("/");

  let profile: EmployeeAccessProfile | null = null;
  try {
    const response = await apiRequest<{ data: EmployeeAccessProfile | null }>("/api/v1/users/me");
    profile = response.data ?? null;
  } catch {
    profile = null;
  }

  if (employeeAccessBlocked(profile)) redirect("/employee/access-pending");

  const permissions = profile?.permissions ?? session.user.permissions ?? [];
  redirect(getFirstPermittedAdminRoute(permissions));
}
