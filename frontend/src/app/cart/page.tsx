import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { CartItemCard } from "@/components/cart-item-card";
import { CustomerCheckoutButton } from "@/components/customer-checkout-button";
import { ShoppingBag } from "lucide-react";

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
    try {
      await apiRequest(`/api/v1/cart/${itemId}`, { method: "DELETE" });
    } catch {}
    revalidatePath("/cart");
    redirect("/cart");
  }

  async function removeGroup(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const itemIds = formData.getAll("itemId").map((value) => String(value)).filter(Boolean);
    await Promise.all(itemIds.map((itemId) => apiRequest(`/api/v1/cart/${itemId}`, { method: "DELETE" }).catch(() => null)));
    revalidatePath("/cart");
    redirect("/cart");
  }

  let items: CartItem[] = [];
  let authRequired = authHint;
  let profileComplete = true;

  try {
    await ensureBackendUserSynced();
    const [cartResponse, profileResponse] = await Promise.all([
      apiRequest<{ data: CartItem[] }>("/api/v1/cart"),
      apiRequest<{ data?: { profileComplete?: boolean | null; role?: string | null } | null }>("/api/v1/users/me"),
    ]);
    items = Array.isArray(cartResponse?.data) ? cartResponse.data : [];
    const profile = profileResponse?.data;
    profileComplete = String(profile?.role ?? "customer").toLowerCase() !== "customer" || profile?.profileComplete !== false;
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

  if (!profileComplete) {
    redirect("/my-account?completeProfile=1&checkout=profile_required");
  }

  const renderItem = (item: CartItem) => <CartItemCard key={item.id} item={item} removeItem={removeItem} />;
  const groupedItems = new Map<string, CartItem[]>();
  const standaloneItems: CartItem[] = [];
  for (const item of items) {
    const groupId = item.itemMetadata?.group_id;
    if (item.itemType === "group_order" && groupId) {
      const existing = groupedItems.get(String(groupId)) ?? [];
      existing.push(item);
      groupedItems.set(String(groupId), existing);
    } else {
      standaloneItems.push(item);
    }
  }

  const renderGroup = ([groupId, groupItems]: [string, CartItem[]]) => {
    const first = groupItems[0];
    const metadata = first.itemMetadata ?? {};
    const groupTitle = String(metadata.design_title ?? first.productName ?? "Custom Group Order");
    const requestNumber = String(metadata.submission_number ?? "");
    const groupTotal = groupItems.reduce((sum, item) => sum + Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1), 0);
    return (
      <details key={groupId} open className="overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-4 p-5 marker:hidden [&::-webkit-details-marker]:hidden sm:p-6">
          <img src={first.productImage || ""} alt={groupTitle} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Group custom design · {groupItems.length} members</p>
            <h2 className="mt-1 truncate font-heading text-xl font-bold">{groupTitle}</h2>
            {requestNumber ? <p className="mt-1 text-xs text-muted-foreground">Request #{requestNumber}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Group total</p>
            <p className="text-2xl font-black text-primary">${groupTotal.toFixed(2)}</p>
          </div>
        </summary>
        <div className="space-y-3 border-t border-primary/20 bg-background/40 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-bold text-muted-foreground">{groupItems.length} members in this group order</p>
            <form action={removeGroup}>
              {groupItems.map((item) => <input key={item.id} type="hidden" name="itemId" value={item.id} />)}
              <button type="submit" className="text-xs font-bold text-destructive hover:underline">Remove group</button>
            </form>
          </div>
          {groupItems.map((item) => {
            const itemMetadata = item.itemMetadata ?? {};
            const memberName = String(itemMetadata.member_name ?? item.productName.replace(/^.*—\s*/, "Member"));
            const memberRole = String(itemMetadata.role_label ?? itemMetadata.member_gender ?? "Member");
            const memberPrice = Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1);
            return (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{memberName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{memberRole}</p>
                </div>
                <p className="shrink-0 text-lg font-black text-primary">${memberPrice.toFixed(2)}</p>
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
            <span className="font-bold text-foreground">Group total</span>
            <span className="text-2xl font-black text-primary">${groupTotal.toFixed(2)}</span>
          </div>
        </div>
      </details>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="mb-10 font-heading text-5xl font-bold">Your Cart</h1>

      <div className="space-y-4">
        <div className="space-y-4">
          {Array.from(groupedItems.entries()).map(renderGroup)}
          {standaloneItems.map(renderItem)}
        </div>

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

          <CustomerCheckoutButton profileComplete={profileComplete} />
        </aside>
      </div>
    </div>
  );
}
