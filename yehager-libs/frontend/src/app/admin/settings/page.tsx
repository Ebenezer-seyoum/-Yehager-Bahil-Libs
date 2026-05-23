import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";
import { AdminSettingsChrome } from "@/components/admin/pages/admin-settings-chrome";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/settings");
  if (session.user.role !== "admin") redirect("/");

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings…</div>}>
      <AdminSettingsChrome>
        <DashboardProfileSettings variant="admin" returnPath="/admin/settings" />
      </AdminSettingsChrome>
    </Suspense>
  );
}
