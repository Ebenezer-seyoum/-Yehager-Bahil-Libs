import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { CartItemCard } from "@/components/cart-item-card";
import { ArrowRight, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

type CartItem = {
  id: string;
  productName: string;
  productImage?: string | null;
  priceUsd?: number | null;
  quantity?: number | null;
  eventName?: string | null;
    measurementSnapshot?: {
      chest?: number | string | null;
      waist?: number | string | null;
      hips?: number | string | null;
      shoulderWidth?: number | string | null;
      armLength?: number | string | null;
      torsoLength?: number | string | null;
    } | null;
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const authHint = query?.auth === "required";

  async function updateItemQuantity(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const itemId = String(formData.get("itemId") ?? "");
    const quantity = Number(formData.get("quantity") ?? 1);
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) return;
    await apiRequest(`/api/v1/cart/${itemId}`, { method: "PATCH", body: { quantity } });
    revalidatePath("/cart");
  }

  async function removeItem(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const itemId = String(formData.get("itemId") ?? "");
    if (!itemId) return;
    await apiRequest(`/api/v1/cart/${itemId}`, { method: "DELETE" });
    revalidatePath("/cart");
  }

  let items: CartItem[] = [];
  let authRequired = authHint;

  try {
    await ensureBackendUserSynced();
    const response = await apiRequest<{ data: CartItem[] }>("/api/v1/cart");
    items = Array.isArray(response?.data) ? response.data : [];
  } catch {
    authRequired = true;
  }

  const total = items.reduce((sum, item) => sum + Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1), 0);
  const eventItems = items.filter((item) => item.eventName);
  const individualItems = items.filter((item) => !item.eventName);

  if (authRequired) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading mb-2 text-2xl font-bold">Sign in to view your cart</h2>
        <p className="mb-6 text-muted-foreground">You need to be signed in before adding and checking out garments.</p>
        <Link href="/signin" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign In
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading mb-2 text-2xl font-bold">Your cart is empty</h2>
        <p className="mb-6 text-muted-foreground">Start browsing the latest collections to add your first piece.</p>
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Browse Collection
        </Link>
      </div>
    );
  }

  const renderItem = (item: CartItem) => <CartItemCard key={item.id} item={item} updateItemQuantity={updateItemQuantity} removeItem={removeItem} />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-primary">Your Home Cart</p>
          <h1 className="font-heading text-4xl font-bold">Cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review custom garments, measurements, and event pieces before checkout.</p>
        </div>
        <Link href="/catalog" className="text-sm font-semibold text-primary hover:underline">
          Continue Shopping
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {eventItems.length > 0 ? (
            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Group Event Items</p>
              <div className="space-y-3">{eventItems.map(renderItem)}</div>
            </section>
          ) : null}

          {individualItems.length > 0 ? (
            <section>
              {eventItems.length > 0 ? <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Individual Items</p> : null}
              <div className="space-y-3">{individualItems.map(renderItem)}</div>
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <p className="font-heading text-xl font-bold">Order Summary</p>
          <div className="mt-5 space-y-3 border-b border-border pb-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and handling are calculated at checkout.</p>
          </div>

          <div className="mt-5 space-y-3 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <PackageCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>Measurements are locked to each custom garment.</span>
            </div>
            <div className="flex gap-2">
              <Truck className="h-4 w-4 shrink-0 text-primary" />
              <span>EMS shipping or Addis Ababa pickup available at checkout.</span>
            </div>
            <div className="flex gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>Secure checkout with card or ETB bank transfer.</span>
            </div>
          </div>

          <Link href="/checkout" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
