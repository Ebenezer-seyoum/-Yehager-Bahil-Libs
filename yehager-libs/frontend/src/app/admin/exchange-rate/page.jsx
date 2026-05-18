import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminExchangeRatePanel } from "@/components/admin-exchange-rate-panel";

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Operations</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Exchange Rate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Maintain the USD to ETB rate used by checkout and reporting.</p>
      </div>
      <AdminExchangeRatePanel exchangeRate={exchangeRate} />
    </div>
  );
}
