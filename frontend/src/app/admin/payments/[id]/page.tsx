import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { PaymentDetailClient } from "@/components/admin/payment-detail-client";

export default async function PaymentVerificationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/admin/payments/${params.id}`);
  if (session.user.role !== "admin") redirect("/admin/payments");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookie = `next-auth.session-token=${(session.user as any).accessToken || ""}`;

  const res = await fetch(`${baseUrl}/api/backend/admin/orders/${params.id}`, { 
    headers: { Cookie: cookie },
  }).catch(() => null);

  const orderData = res && res.ok ? await res.json() : null;

  if (!orderData?.data) {
    redirect("/admin/payments");
  }

  return (
    <PaymentDetailClient
      order={orderData.data}
    />
  );
}
