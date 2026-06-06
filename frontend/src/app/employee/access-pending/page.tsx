import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";

export default async function EmployeeAccessPendingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/employee/access-pending");
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");

  return null;
}

