import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { PaymentDetailClient } from "@/components/admin/payment-detail-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function PaymentVerificationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/admin/payments`);
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/admin/payments");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="Payment Details" />;
  }

  const { id } = await params;

  let orderData: any = null;
  try {
    const response: any = await apiRequest(`/api/v1/orders/admin/${id}`);
    orderData = response?.data ?? null;
  } catch (err) {
    console.error("Failed fetching order for payment detail:", err);
    orderData = null;
  }

  if (!orderData) {
    redirect("/admin/payments");
  }

  return (
    <PaymentDetailClient
      order={orderData}
      canVerify={session.user.role === "admin" || can(session.user.permissions, "payments.verify")}
    />
  );
}
