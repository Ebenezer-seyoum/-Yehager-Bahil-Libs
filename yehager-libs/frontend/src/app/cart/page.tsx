import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { CartItemCard } from "@/components/cart-item-card";
import { ArrowRight, ShoppingBag } from "lucide-react";

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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 font-heading text-3xl font-bold">Cart</h1>

      <div className="space-y-4">
        {eventItems.length > 0 ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Group Event Items</p>
            <div className="space-y-3">{eventItems.map(renderItem)}</div>
          </div>
        ) : null}

        {individualItems.length > 0 ? (
          <div>
            {eventItems.length > 0 ? <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Individual Items</p> : null}
            <div className="space-y-3">{individualItems.map(renderItem)}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
          <span className="text-2xl font-bold">${total.toFixed(2)}</span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Shipping and handling are calculated at checkout.</p>
        <Link href="/checkout" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Proceed to Checkout <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
