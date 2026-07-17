import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { can } from "@/lib/permissions";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";
import { AdminSettingsChrome } from "@/components/admin/pages/admin-settings-chrome";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { apiRequest } from "@/lib/api-client";
import { AdminSystemSettingsWorkspace } from "@/components/admin/pages/admin-system-settings-workspace";

const configurableTabs = new Set(["overview", "store", "orders", "notifications", "security", "integrations", "appearance", "maintenance", "audit", "team"]);

export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/settings");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "settings.view")) {
    return <AccessRestricted requiredPermission="settings.view" sectionName="Settings" />;
  }

  const query = (await searchParams) ?? {};
  const tab = query.tab ?? "overview";
  let settings: Array<{ key: string; category: string; value: string | number | boolean | null; description?: string | null }> = [];
  try {
    const response = await apiRequest<{ data: typeof settings }>("/api/v1/admin/settings");
    settings = response.data ?? [];
  } catch {
    settings = [];
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings…</div>}>
      <AdminSettingsChrome>
        {tab === "profile" ? <DashboardProfileSettings variant="admin" returnPath="/admin/settings" /> : <AdminSystemSettingsWorkspace initialSettings={settings} category={configurableTabs.has(tab) ? tab : "overview"} canEdit={session.user.role === "admin" || can(session.user.permissions, "settings.edit")} />}
      </AdminSettingsChrome>
    </Suspense>
  );
}
