import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { DashboardProfileSettingsClient, type DashboardProfile } from "@/components/dashboard-profile-settings-client";

export async function DashboardProfileSettings({
  variant,
}: {
  variant: "admin" | "employee";
  returnPath: string;
}) {
  const session = await getServerSession(authOptions);
  let profile: DashboardProfile | null = null;
  try {
    const response = await apiRequest<{ data: DashboardProfile | null }>("/api/v1/users/me");
    profile = response.data ?? null;
  } catch {
    profile = null;
  }

  return <DashboardProfileSettingsClient initialProfile={profile} sessionUser={session?.user ?? null} variant={variant} />;
}
