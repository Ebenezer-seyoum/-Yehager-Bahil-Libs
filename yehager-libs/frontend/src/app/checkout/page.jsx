import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function CheckoutPage({ searchParams }) {
  async function startCheckout(formData) {
    "use server";
    await ensureBackendUserSynced();
    const paymentMethod = String(formData.get("paymentMethod") ?? "stripe_usd");
    const paymentCurrency = paymentMethod === "etb_bank_transfer" ? "ETB" : "USD";

    try {
      const cartRes = await apiRequest("/api/v1/cart");
      const items = Array.isArray(cartRes?.data) ? cartRes.data : [];
      if (items.length === 0) {
        redirect("/cart");
      }

      const cartItemIds = items.map((item) => item.id);
      const intentRes = await apiRequest("/api/v1/orders/checkout-intent", {
        method: "POST",
        body: {
          cartItemIds,
          paymentMethod,
          paymentCurrency,
          fulfillmentType: "mail",
        },
      });

      const orderId = intentRes?.data?.order?.id;
      if (!orderId) {
        throw new Error("Missing order id from checkout intent");
      }

      // USD flow goes through Stripe Checkout session.
      if (paymentMethod === "stripe_usd") {
        const stripeRes = await apiRequest("/api/v1/payments/stripe/checkout-session", {
          method: "POST",
          body: {
            orderId,
            successPath: "/order-confirmation",
            cancelPath: "/checkout",
          },
        });
        const checkoutUrl = stripeRes?.data?.url;
        if (checkoutUrl) {
          revalidatePath("/cart");
          redirect(checkoutUrl);
        }
      }

      // ETB/manual transfer path: for now continue to confirmation-like page with order id.
      revalidatePath("/cart");
      redirect(`/order-confirmation?order=${orderId}`);
    } catch {
      redirect("/checkout?error=1");
    }
  }

  let items = [];
  let authRequired = false;
  try {
    await ensureBackendUserSynced();
    const cartRes = await apiRequest("/api/v1/cart");
    items = Array.isArray(cartRes?.data) ? cartRes.data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    authRequired = message.includes("No authenticated user found") || message.includes("401") || message.includes("Unauthorized");
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1), 0);
  const hasError = searchParams?.error === "1";

  if (authRequired) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-semibold">Checkout</h1>
        <p className="mt-3 text-muted-foreground">Sign in is required to continue to checkout.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-semibold">Checkout</h1>
        <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
        <Link href="/catalog" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Browse collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-heading text-3xl font-semibold">Checkout</h1>

      {hasError ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Checkout failed. Please try again.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0">
              <p className="min-w-0 truncate text-sm">{item.productName}</p>
              <p className="text-sm text-muted-foreground">x{item.quantity}</p>
              <p className="text-sm font-medium">${(Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1)).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <form action={startCheckout} className="h-fit rounded-xl border border-border bg-card p-5">
          <p className="text-sm uppercase tracking-widest text-primary">Payment</p>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="paymentMethod" value="stripe_usd" defaultChecked />
              <span>Card (Stripe, USD)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="paymentMethod" value="etb_bank_transfer" />
              <span>Bank Transfer (ETB)</span>
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-xl font-bold">${subtotal.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Shipping will be applied per fulfillment policy.</p>

          <button
            type="submit"
            className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Place Order
          </button>
        </form>
      </div>
    </div>
  );
}
