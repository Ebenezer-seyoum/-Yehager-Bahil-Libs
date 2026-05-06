import Link from "next/link";

export default async function OrderConfirmationPage({ searchParams }) {
  const orderId = searchParams?.order ?? null;
  const sessionId = searchParams?.session_id ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-primary">Order Confirmation</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold">Thank you for your order</h1>
      <p className="mt-3 text-muted-foreground">
        Your payment flow completed. We will update order and fulfillment status in your account.
      </p>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-border bg-card p-4 text-left text-sm">
        <p>
          <span className="text-muted-foreground">Order:</span> {orderId ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Stripe Session:</span> {sessionId ?? "—"}
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-3">
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
