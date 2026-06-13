import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

export type EmployeeAccessProfile = {
  role?: string | null;
  roleStatus?: "unassigned" | "assigned" | null;
  assignedRoleId?: string | null;
  assignedRoleActive?: boolean | null;
  assignedRoleName?: string | null;
  permissions?: string[] | null;
};

export function employeeAccessBlocked(profile: EmployeeAccessProfile | null) {
  const permissions = Array.isArray(profile?.permissions) ? profile.permissions : [];
  return (
    profile?.role === "employee" &&
    (profile.roleStatus === "unassigned" ||
      profile.assignedRoleActive === false ||
      permissions.length === 0)
  );
}

export async function requireEmployeePageAccess(callbackUrl: string, permissionKey: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");

  if (session.user.role === "admin") {
    return { session, profile: null };
  }

  let profile: EmployeeAccessProfile | null = null;
  try {
    const response = await apiRequest<{ data: EmployeeAccessProfile | null }>("/api/v1/users/me");
    profile = response.data ?? null;
  } catch {
    profile = null;
  }

  const permissions = Array.isArray(profile?.permissions) ? profile.permissions : [];
  if (employeeAccessBlocked(profile) || !permissions.includes(permissionKey)) {
    redirect("/employee/access-pending");
  }

  return { session, profile };
}
