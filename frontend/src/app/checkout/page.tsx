import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { CheckoutFlow } from "@/components/checkout-flow";

type CartItem = {
  id: string;
  productName: string;
  productImage?: string | null;
  priceUsd?: number | null;
  quantity?: number | null;
  eventId?: string | null;
  eventName?: string | null;
};

type Event = {
  id: string;
  name?: string | null;
  ownerName?: string | null;
  shippingAddress?: Record<string, unknown> | null;
};

type Profile = {
  role?: string | null;
  profileComplete?: boolean | null;
};
type CustomerCredit = { balanceUsd?: string | number | null; eligibleSection?: string | null };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const role = String(session?.user?.role ?? "").toLowerCase();
  const isStaffAccount = role === "admin" || role === "employee";
  const dashboardHref = role === "employee" ? "/employee" : "/admin";

  async function startCheckout(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const checkoutSession = await getServerSession(authOptions);
    const checkoutRole = String(checkoutSession?.user?.role ?? "").toLowerCase();
    if (checkoutRole === "admin" || checkoutRole === "employee") {
      redirect("/checkout?error=staff_preview");
    }

    const paymentMethod = String(formData.get("paymentMethod") ?? "stripe_usd");
    const paymentCurrency = paymentMethod === "etb_bank_transfer" ? "ETB" : "USD";
    const fulfillmentType = String(formData.get("fulfillmentType") ?? "mail") as "mail" | "pickup";
    const carrier = fulfillmentType === "pickup" ? "pickup" : String(formData.get("carrier") ?? "Ethiopian Mail Service");
    const pickupLocation = String(formData.get("pickupLocation") ?? "");
    const pickupPersonName = String(formData.get("pickupPersonName") ?? "");
    const pickupPersonPhone = String(formData.get("pickupPersonPhone") ?? "");
    const shipChoice = String(formData.get("shipChoice") ?? "own");
    const tailorNote = String(formData.get("checkoutTailorNote") || formData.get("tailorNote") || "");
    const couponCode = String(formData.get("couponCode") ?? "").trim();
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

    let destination = "";

    try {
      const cartRes = await apiRequest<{ data: CartItem[] }>("/api/v1/cart");
      const items = Array.isArray(cartRes?.data) ? cartRes.data : [];
      if (items.length === 0) {
        destination = "/cart";
      } else {
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
            remarks: tailorNote || undefined,
            couponCode: couponCode || undefined,
            useCustomerCredit: formData.get("useCustomerCredit") === "on",
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
          if (!stripeRes?.data?.url) throw new Error("Missing Stripe checkout URL");
          destination = stripeRes.data.url;
        } else {
          destination = `/checkout/etb?order=${orderId}`;
        }

        revalidatePath("/cart");
      }
    } catch (e: unknown) {
      console.error("Checkout error:", e);
      const message = e instanceof Error ? e.message : "Internal Error";
      const msgLow = message.toLowerCase();
      const errorKey = msgLow.includes("coupon")
        ? "coupon"
        : msgLow.includes("exchange rate") || msgLow.includes("etb rate") || msgLow.includes("usd_etb")
          ? "etb_rate"
          : "checkout";
      redirect(`/checkout?error=${errorKey}&debug=${encodeURIComponent(message)}`);
    }

    redirect(destination);
  }

  let items: CartItem[] = [];
  let event: Event | null = null;
  let etbRate: number | null = null;
  let authRequired = false;
  let profileComplete = true;
  let customerCredit: CustomerCredit = { balanceUsd: 0, eligibleSection: "Other" };
  try {
    await ensureBackendUserSynced();
    const [cartRes, rateRes, profileRes, creditRes] = await Promise.all([
      apiRequest<{ data: CartItem[] }>("/api/v1/cart"),
      backendPublicRequest("/api/v1/exchange-rate").catch(() => ({ data: null })),
      apiRequest<{ data?: Profile | null }>("/api/v1/users/me"),
      apiRequest<{ data?: CustomerCredit }>("/api/v1/users/me/customer-credit").catch(() => ({ data: undefined })),
    ]);
    items = Array.isArray(cartRes?.data) ? cartRes.data : [];
    etbRate = Number(rateRes?.data?.rate ?? 0) || null;
    const profile = profileRes?.data;
    customerCredit = creditRes?.data ?? customerCredit;
    profileComplete = String(profile?.role ?? role ?? "customer").toLowerCase() !== "customer" || profile?.profileComplete !== false;
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
        <Link href="/signin?callbackUrl=/checkout" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign In
        </Link>
      </div>
    );
  }

  if (!profileComplete) {
    redirect("/my-account?completeProfile=1&checkout=profile_required");
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

  if (isStaffAccount) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-red-950 bg-[#4a0505] p-8 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100">Staff Preview Mode</p>
          <h1 className="mt-3 font-heading text-4xl font-bold">Checkout is disabled for staff accounts</h1>
          <p className="mt-4 text-base leading-7 text-red-50">
            You can review the customer storefront, browse products, inspect the cart, and verify the checkout entry point. To protect live customer operations, admin and employee accounts cannot submit payment or create customer orders.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/cart" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10">
              Return to Cart
            </Link>
            <Link href="/" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10">
              Continue Storefront Review
            </Link>
            <Link href={dashboardHref} className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-[#4a0505] hover:bg-red-50">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const err = typeof query?.error === "string" ? query.error : "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-bold mb-8">Checkout</h1>

      <CheckoutFlow items={items} event={event} error={err} etbRate={etbRate} customerCredit={customerCredit} startCheckoutAction={startCheckout} />
    </div>
  );
}
