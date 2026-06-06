import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { DashboardProfileSettings } from "@/components/dashboard-profile-settings";

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/profile");
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");

  return (
    <DashboardProfileSettings
      variant={session.user.role === "employee" ? "employee" : "admin"}
      returnPath="/admin/profile"
    />
  );
}
