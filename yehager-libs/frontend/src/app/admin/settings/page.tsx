import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/settings");
  if (session.user.role !== "admin") redirect("/");

  return <DashboardProfileSettings variant="admin" returnPath="/admin/settings" />;
}
