import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { EtbPaymentProof } from "@/components/etb-payment-proof";

type Order = {
  id: string;
  orderNumber: string;
  totalEtb?: number | null;
  etbExchangeRate?: number | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
};

export default async function EtbCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const orderId = typeof query?.order === "string" ? query.order : null;
  if (!orderId) redirect("/checkout");

  await ensureBackendUserSynced();
  const response = await apiRequest<{ data: Order }>(`/api/v1/orders/me/${orderId}`);
  const order = response.data;
  if (order.paymentMethod !== "etb_bank_transfer" || order.paymentCurrency !== "ETB") {
    redirect("/checkout");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 font-heading text-3xl font-bold">Bank Transfer Payment</h1>
      <p className="mb-8 text-sm text-muted-foreground">Complete your ETB transfer and upload the payment proof to continue.</p>
      <EtbPaymentProof
        orderId={order.id}
        orderNumber={order.orderNumber}
        totalEtb={order.totalEtb == null ? null : Number(order.totalEtb)}
        etbExchangeRate={order.etbExchangeRate ? Number(order.etbExchangeRate) : null}
      />
    </div>
  );
}
