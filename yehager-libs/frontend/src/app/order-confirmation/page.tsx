import Link from "next/link";
import { CheckCircle, Package } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type OrderDetails = {
  id: string;
  orderNumber?: string | null;
  totalUsd?: number | null;
  totalEtb?: number | null;
  paymentCurrency?: "USD" | "ETB" | null;
  paymentStatus?: string | null;
};

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const orderId = typeof query?.order === "string" ? query.order : null;

  let order: OrderDetails | null = null;
  if (orderId) {
    try {
      await ensureBackendUserSynced();
      const response = await apiRequest<{ data: OrderDetails }>(`/api/v1/orders/me/${orderId}`);
      order = response?.data ?? null;
    } catch {
      order = null;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="mb-3 font-heading text-3xl font-bold">Order Confirmed!</h1>
      <p className="mb-2 text-muted-foreground">Thank you for choosing Yehager Bahil Libs.</p>

      {order ? (
        <p className="mb-2 text-sm text-muted-foreground">
          Order <span className="font-mono font-bold text-foreground">{order.orderNumber ?? order.id}</span> -{" "}
          {order.paymentCurrency === "ETB" && order.totalEtb ? `${Number(order.totalEtb).toLocaleString()} ETB` : `$${Number(order.totalUsd ?? 0).toFixed(2)}`}
        </p>
      ) : null}

      <div className="mb-8 mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 text-left">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">What&apos;s Next</p>
            <p className="text-xs text-muted-foreground">Our master tailors are preparing your garment.</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
            <span>Tailoring and embroidery (~30 days)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">2</div>
            <span>Quality inspection</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">3</div>
            <span>Global shipping and tracking</span>
          </div>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        A confirmation email has been sent. You have 24 hours to request updates by contacting support@yehagerbahillibs.com
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/my-orders" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          View My Orders
        </Link>
        <Link href="/catalog" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
