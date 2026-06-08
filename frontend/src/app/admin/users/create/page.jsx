import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { AdminEmployeesWorkspace } from "@/components/admin/pages/admin-employees-workspace";

export default async function CreateEmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (session.user.role !== "admin") redirect("/admin/users");

  return <AdminEmployeesWorkspace data={{ users: [] }} autoOpenCreate={true} />;
}
