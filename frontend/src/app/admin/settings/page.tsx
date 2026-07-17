import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { can } from "@/lib/permissions";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";
import { AdminSettingsChrome } from "@/components/admin/pages/admin-settings-chrome";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { DashboardAppearanceSettings } from "@/components/dashboard-appearance-settings";
export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/settings");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "settings.view")) {
    return <AccessRestricted requiredPermission="settings.view" sectionName="Settings" />;
  }

  const tab = (await searchParams)?.tab ?? "profile";

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings…</div>}>
      <AdminSettingsChrome>
        {tab === "appearance" ? <DashboardAppearanceSettings /> : <DashboardProfileSettings variant="admin" returnPath="/admin/settings" />}
      </AdminSettingsChrome>
    </Suspense>
  );
}
