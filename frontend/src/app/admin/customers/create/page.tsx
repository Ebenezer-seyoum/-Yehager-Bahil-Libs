import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { CustomerCreateClient } from "@/components/admin/customer-create-client";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { can } from "@/lib/permissions";

export default async function CreateCustomerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers/create");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "customers.create")) {
    return <AccessRestricted requiredPermission="customers.create" sectionName="Customer Create" />;
  }

  return <CustomerCreateClient />;
}
