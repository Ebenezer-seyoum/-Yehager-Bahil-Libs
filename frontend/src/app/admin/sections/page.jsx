import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { AdminSectionsWorkspace } from "@/components/admin/pages/admin-sections-workspace";

export default async function AdminSectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/sections");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  return <AdminSectionsWorkspace data={{}} />;
}
