import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";

export default async function EmployeeSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/employee/settings");
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");
  if (session.user.role === "employee" && session.user.roleStatus === "unassigned") redirect("/employee/access-pending");

  return <DashboardProfileSettings variant="employee" returnPath="/employee/settings" />;
}
