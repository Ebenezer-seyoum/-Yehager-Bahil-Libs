import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type CartItem = {
  id: string;
  productName: string;
  priceUsd?: number | null;
  quantity?: number | null;
  eventId?: string | null;
};

type Event = {
  id: string;
  name?: string | null;
  ownerName?: string | null;
  shippingAddress?: Record<string, unknown> | null;
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;

  async function startCheckout(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();

    const paymentMethod = String(formData.get("paymentMethod") ?? "stripe_usd");
    const paymentCurrency = paymentMethod === "etb_bank_transfer" ? "ETB" : "USD";
    const fulfillmentType = String(formData.get("fulfillmentType") ?? "mail") as "mail" | "pickup";
    const carrier = fulfillmentType === "pickup" ? "pickup" : String(formData.get("carrier") ?? "Ethiopian Mail Service");
    const pickupLocation = String(formData.get("pickupLocation") ?? "");
    const pickupPersonName = String(formData.get("pickupPersonName") ?? "");
    const pickupPersonPhone = String(formData.get("pickupPersonPhone") ?? "");
    const shipChoice = String(formData.get("shipChoice") ?? "own");
    const agreed = formData.get("agreeTerms") === "on";

    if (!agreed) {
      redirect("/checkout?error=terms");
    }

    const shippingAddress =
      fulfillmentType === "mail"
        ? {
            full_name: String(formData.get("full_name") ?? ""),
            street: String(formData.get("street") ?? ""),
            city: String(formData.get("city") ?? ""),
            state: String(formData.get("state") ?? ""),
            zip: String(formData.get("zip") ?? ""),
            country: String(formData.get("country") ?? ""),
            phone: String(formData.get("phone") ?? ""),
          }
        : undefined;

    if (fulfillmentType === "mail" && shipChoice === "own") {
      const required = ["street", "city", "country", "phone"];
      const missing = required.some((field) => !String((shippingAddress as Record<string, unknown>)?.[field] ?? "").trim());
      if (missing) redirect("/checkout?error=address");
    }
    if (fulfillmentType === "pickup" && (!pickupPersonName.trim() || !pickupPersonPhone.trim())) {
      redirect("/checkout?error=pickup");
    }

    try {
      const cartRes = await apiRequest<{ data: CartItem[] }>("/api/v1/cart");
      const items = Array.isArray(cartRes?.data) ? cartRes.data : [];
      if (items.length === 0) redirect("/cart");

      const cartItemIds = items.map((item) => item.id);
      const intentRes = await apiRequest<{ data: { order: { id: string } } }>("/api/v1/orders/checkout-intent", {
        method: "POST",
        body: {
          cartItemIds,
          paymentMethod,
          paymentCurrency,
          fulfillmentType,
          shippingAddress,
          useEventOwnerAddress: shipChoice === "event_owner",
          carrier,
          pickupLocation: pickupLocation || undefined,
          pickupPersonName: pickupPersonName || undefined,
          pickupPersonPhone: pickupPersonPhone || undefined,
        },
      });

      const orderId = intentRes?.data?.order?.id;
      if (!orderId) throw new Error("Missing order id");

      if (paymentMethod === "stripe_usd") {
        const stripeRes = await apiRequest<{ data: { url?: string } }>("/api/v1/payments/stripe/checkout-session", {
          method: "POST",
          body: {
            orderId,
            successPath: "/order-confirmation",
            cancelPath: "/checkout",
          },
        });
        if (stripeRes?.data?.url) {
          revalidatePath("/cart");
          redirect(stripeRes.data.url);
        }
      }

      revalidatePath("/cart");
      redirect(`/checkout/etb?order=${orderId}`);
    } catch {
      redirect("/checkout?error=checkout");
    }
  }

  let items: CartItem[] = [];
  let event: Event | null = null;
  let authRequired = false;
  try {
    await ensureBackendUserSynced();
    const cartRes = await apiRequest<{ data: CartItem[] }>("/api/v1/cart");
    items = Array.isArray(cartRes?.data) ? cartRes.data : [];
    const eventIds = [...new Set(items.map((item) => item.eventId).filter(Boolean))];
    if (eventIds.length === 1) {
      try {
        const eventRes = await backendPublicRequest(`/api/v1/events/${eventIds[0]}`);
        event = eventRes?.data ?? null;
      } catch {
        event = null;
      }
    }
  } catch {
    authRequired = true;
  }

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

  const subtotal = items.reduce((sum, item) => sum + Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1), 0);
  const err = typeof query?.error === "string" ? query.error : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 font-heading text-3xl font-bold">Checkout</h1>

      {err ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err === "terms"
            ? "Please agree to tailoring terms before placing your order."
            : err === "address"
              ? "Please complete the required shipping address fields."
              : err === "pickup"
                ? "Please provide the pickup person's name and phone number."
                : "Checkout failed. Please try again."}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">Custom Tailoring Notice</p>
        <p className="mt-0.5 text-xs text-amber-700">
          All orders are custom-tailored and require a minimum of one month for production and delivery.
        </p>
      </div>

      {event?.name ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Event order</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This cart is linked to <span className="font-medium text-foreground">{event.name}</span>. You can ship to yourself or use the event owner&apos;s address when available.
          </p>
        </div>
      ) : null}

      <form action={startCheckout} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Items</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0">
                  <p className="min-w-0 truncate text-sm">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                  <p className="text-sm font-medium">${(Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1)).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Delivery Method</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-border p-3">
                <input type="radio" name="fulfillmentType" value="mail" defaultChecked />
                <span className="text-sm">Mail Delivery</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border p-3">
                <input type="radio" name="fulfillmentType" value="pickup" />
                <span className="text-sm">In-Store Pickup</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Shipping / Pickup Details</p>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Carrier for mail delivery</span>
                <select name="carrier" defaultValue="Ethiopian Mail Service" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="Ethiopian Mail Service">Ethiopian Mail Service</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Pickup location</span>
                <select name="pickupLocation" defaultValue="Dember Building – 3rd Floor, Store #369" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="Dember Building – 3rd Floor, Store #369">Dember Building – 3rd Floor, Store #369</option>
                  <option value="Zefmesh Building – 7th Floor, Suite #717">Zefmesh Building – 7th Floor, Suite #717</option>
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Pickup person name</span>
                  <input name="pickupPersonName" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Pickup person phone</span>
                  <input name="pickupPersonPhone" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Shipping Address (for mail delivery)</p>
            {event?.shippingAddress ? (
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="radio" name="shipChoice" value="own" defaultChecked />
                  <span>Ship to my address</span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="radio" name="shipChoice" value="event_owner" />
                  <span>Ship to event owner {event.ownerName ? `(${event.ownerName})` : ""}</span>
                </label>
              </div>
            ) : (
              <input type="hidden" name="shipChoice" value="own" />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["full_name", "Full Name"],
                ["street", "Street Address"],
                ["city", "City"],
                ["state", "State / Province"],
                ["zip", "ZIP / Postal Code"],
                ["country", "Country"],
                ["phone", "Phone Number"],
              ].map(([name, label]) => (
                <div key={name} className={name === "full_name" || name === "street" || name === "phone" ? "sm:col-span-2" : ""}>
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input name={name} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm">
            <input type="checkbox" name="agreeTerms" className="mt-0.5" />
            <span>I agree that this is a custom-tailored order and cannot be cancelled or refunded after production starts.</span>
          </label>
        </div>

        <div className="h-fit rounded-xl border border-border bg-card p-5">
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
          <div className="mt-3 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            EMS shipping is calculated server-side from item count: $45 for one item, $100 for 2–5 items, then the package cycle repeats.
          </div>

          <button type="submit" className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Place Order
          </button>
        </div>
      </form>
    </div>
  );
}
