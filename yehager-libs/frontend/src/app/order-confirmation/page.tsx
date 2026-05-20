import Link from "next/link";
import { CheckCircle, GraduationCap, Package } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { LEARN_LANGUAGES_URL } from "@/lib/taxonomy";

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
      <h1 className="mb-3 font-heading text-3xl font-bold">{order?.paymentStatus === "awaiting_verification" ? "Order Received!" : "Order Confirmed!"}</h1>
      <p className="mb-2 text-muted-foreground">Thank you for choosing Yehager Bahil Libs.</p>

      {order ? (
        <p className="mb-2 text-sm text-muted-foreground">
          Order <span className="font-mono font-bold text-foreground">{order.orderNumber ?? order.id}</span> -{" "}
          {order.paymentCurrency === "ETB" && order.totalEtb ? `${Number(order.totalEtb).toLocaleString()} ETB` : `$${Number(order.totalUsd ?? 0).toFixed(2)}`}
        </p>
      ) : null}

      {order?.paymentStatus === "awaiting_verification" ? (
        <div className="mx-auto mb-8 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-600">Payment Verification In Progress</p>
          <p className="text-xs leading-relaxed text-amber-700">
            We have received your bank transfer proof. Our team will verify your payment shortly and tailoring will begin once verified.
          </p>
        </div>
      ) : (
        <div className="mb-8" />
      )}

      <div className="mb-8 space-y-4 rounded-2xl border border-border bg-card p-6 text-left">
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
            <span>Tailoring & Embroidery (~30 days)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">2</div>
            <span>Quality inspection</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">3</div>
            <span>Global Shipping & Tracking</span>
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

      <a
        href={LEARN_LANGUAGES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 block rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-left text-white shadow-lg shadow-emerald-900/20 transition-all hover:from-emerald-700 hover:to-teal-800"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-base font-bold">Interested in learning Ethiopian Languages? Start here</p>
            <p className="mt-0.5 text-xs text-white/80">Live classes in Amharic, Afan Oromo, Tigrigna & English</p>
          </div>
          <span className="text-2xl">-&gt;</span>
        </div>
      </a>
    </div>
  );
}
