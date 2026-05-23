import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminExchangeWorkspace } from "@/components/admin/pages/admin-exchange-workspace";

export default async function AdminExchangeRatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/exchange-rate");
  if (session.user.role !== "admin") redirect("/");

  let exchangeRate = null;
  try {
    const response = await apiRequest("/api/v1/exchange-rate");
    exchangeRate = response?.data ?? null;
  } catch {
    exchangeRate = null;
  }

  return <AdminExchangeWorkspace exchangeRate={exchangeRate} />;
}
