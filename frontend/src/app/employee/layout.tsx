import { DashboardShell } from "@/components/dashboard-shell";
import { employeeNavigation } from "@/lib/dashboard-navigation";
import { apiRequest } from "@/lib/api-client";

type EmployeeProfilePayload = {
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  assignedRoleName?: string | null;
  assignedRoleActive?: boolean | null;
  roleStatus?: "unassigned" | "assigned" | null;
  permissions?: string[] | null;
  profile?: {
    firstName?: string | null;
    fatherName?: string | null;
  } | null;
};

function employeeDisplayName(profile: EmployeeProfilePayload | null) {
  const firstFather = [profile?.profile?.firstName, profile?.profile?.fatherName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return firstFather || profile?.displayName || profile?.name || null;
}

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  let profile: EmployeeProfilePayload | null = null;
  try {
    const response = await apiRequest<{ data: EmployeeProfilePayload | null }>("/api/v1/users/me");
    profile = response.data ?? null;
  } catch {
    profile = null;
  }

  return (
    <DashboardShell
      navigation={employeeNavigation}
      title="Operations workspace"
      subtitle="Focused tools for daily product and order work."
      variant="employee"
      accountProfile={{
        displayName: employeeDisplayName(profile),
        avatarUrl: profile?.avatarUrl ?? null,
        assignedRoleName: profile?.assignedRoleName ?? null,
        assignedRoleActive: profile?.assignedRoleActive ?? null,
        roleStatus: profile?.roleStatus ?? null,
        permissions: profile?.permissions ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
