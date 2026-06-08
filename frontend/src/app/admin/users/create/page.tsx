import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { EmployeeCreateClient } from "@/components/admin/employee-create-client";

export default async function CreateEmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users/create");
  if (session.user.role !== "admin") redirect("/admin/users");

  // Fetch roles for the creation form
  const rolesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backend/admin/roles`, {
    headers: {
      Cookie: `next-auth.session-token=${(session.user as any).accessToken || ""}`
    },
    next: { tags: ["roles"] }
  }).catch(() => null);
  
  const rolesData = rolesRes ? await rolesRes.json().catch(() => ({ roles: [] })) : { roles: [] };

  return <EmployeeCreateClient roles={rolesData.roles || []} />;
}
