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
  itemType?: string | null;
  itemMetadata?: Record<string, unknown> | null;
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
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0);

  if (authRequired) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading mb-2 text-2xl font-bold">Sign in to view your cart</h2>
        <p className="mb-6 text-muted-foreground">You need to be signed in before adding and checking out garments.</p>
        <Link href="/signin?callbackUrl=/cart" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
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
        <p className="mb-6 text-muted-foreground">Start browsing the latest catalog items to add your first piece.</p>
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Browse Catalog
        </Link>
      </div>
    );
  }

  const renderItem = (item: CartItem) => <CartItemCard key={item.id} item={item} removeItem={removeItem} />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="mb-10 font-heading text-5xl font-bold">Your Cart</h1>

      <div className="space-y-4">
        <div className="space-y-3">{items.map(renderItem)}</div>

        <aside className="mt-12 rounded-3xl border border-border bg-card p-8">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="text-muted-foreground">
                Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
              </span>
            </div>
            <span className="text-4xl font-bold">${total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Shipping calculated at checkout</p>

          <Link href="/checkout" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-black hover:bg-primary/90">
            Proceed to Checkout <ArrowRight className="h-5 w-5" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
