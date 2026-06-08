import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { CustomerCreateClient } from "@/components/admin/customer-create-client";

export default async function CreateCustomerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers/create");
  if (session.user.role !== "admin") redirect("/admin/customers");

  return <CustomerCreateClient />;
}
