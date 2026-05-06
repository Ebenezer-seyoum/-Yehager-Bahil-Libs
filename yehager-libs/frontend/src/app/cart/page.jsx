import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function CartPage({ searchParams }) {
  async function updateItemQuantity(formData) {
    "use server";
    await ensureBackendUserSynced();
    const itemId = String(formData.get("itemId") ?? "");
    const quantity = Number(formData.get("quantity") ?? 1);
    if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    await apiRequest(`/api/v1/cart/${itemId}`, {
      method: "PATCH",
      body: { quantity },
    });
    revalidatePath("/cart");
  }

  async function removeItem(formData) {
    "use server";
    await ensureBackendUserSynced();
    const itemId = String(formData.get("itemId") ?? "");
    if (!itemId) {
      return;
    }
    await apiRequest(`/api/v1/cart/${itemId}`, {
      method: "DELETE",
    });
    revalidatePath("/cart");
  }

  const addProductId = searchParams?.add;
  if (addProductId) {
    try {
      await ensureBackendUserSynced();
      await apiRequest("/api/v1/cart", {
        method: "POST",
        body: { productId: addProductId, quantity: 1 },
      });
      redirect("/cart");
    } catch {
      redirect("/cart?auth=required");
    }
  }

  let items = [];
  let authRequired = false;

  try {
    await ensureBackendUserSynced();
    const response = await apiRequest("/api/v1/cart");
    items = Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    authRequired =
      message.includes("No authenticated user found") ||
      message.includes("401") ||
      message.includes("Unauthorized") ||
      searchParams?.auth === "required";
  }

  const total = items.reduce((sum, item) => {
    const price = Number(item.priceUsd ?? 0);
    const qty = Number(item.quantity ?? 1);
    return sum + price * qty;
  }, 0);

  if (authRequired) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-semibold">Cart</h1>
        <p className="mt-3 text-muted-foreground">Sign in is required to view your cart.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Auth routes will be wired in the next auth migration step.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-heading text-3xl font-semibold">Cart</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link href="/catalog" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Browse collection
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="h-20 w-20 overflow-hidden rounded-lg bg-secondary">
                  {item.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <form action={updateItemQuantity}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="quantity" value={Math.max(1, Number(item.quantity ?? 1) - 1)} />
                      <button className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary" type="submit">
                        -
                      </button>
                    </form>
                    <form action={updateItemQuantity}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="quantity" value={Number(item.quantity ?? 1) + 1} />
                      <button className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary" type="submit">
                        +
                      </button>
                    </form>
                    <form action={removeItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button className="rounded border border-border px-2 py-0.5 text-xs text-destructive hover:bg-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary">${(Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1)).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold">${total.toFixed(2)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Shipping and taxes are calculated at checkout.</p>
            <Link
              href="/checkout"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
