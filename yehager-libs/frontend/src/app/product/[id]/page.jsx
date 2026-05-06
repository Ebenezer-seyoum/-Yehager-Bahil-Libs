import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { RoutePlaceholder } from "@/components/route-placeholder";

export default async function ProductDetailPage({ params, searchParams }) {
  const { id } = await params;
  const authRequired = searchParams?.auth === "required";

  async function addToCart(formData) {
    "use server";
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    const measurementIdRaw = String(formData.get("measurementId") ?? "");
    const measurementId = measurementIdRaw.length > 0 ? measurementIdRaw : undefined;

    try {
      await apiRequest("/api/v1/cart", {
        method: "POST",
        body: {
          productId,
          quantity: 1,
          measurementId,
        },
      });
      revalidatePath("/cart");
      redirect("/cart");
    } catch {
      redirect(`/product/${productId}?auth=required`);
    }
  }

  let product;
  let measurements = [];
  try {
    const response = await backendPublicRequest(`/api/v1/products/${id}`);
    product = response?.data;
  } catch {
    return <RoutePlaceholder title="Product Detail (not found)" path={`/product/${id}`} />;
  }

  try {
    await ensureBackendUserSynced();
    const response = await apiRequest("/api/v1/measurements");
    measurements = Array.isArray(response?.data) ? response.data : [];
  } catch {
    measurements = [];
  }

  if (!product) {
    return <RoutePlaceholder title="Product Detail (not found)" path={`/product/${id}`} />;
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImage = images[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="space-y-3">
        <div className="aspect-3/4 overflow-hidden rounded-2xl border border-border bg-card">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.slice(0, 5).map((img) => (
              <div key={img} className="aspect-square overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary">{product.region}</p>
          <h1 className="font-heading text-4xl font-semibold">{product.name}</h1>
          <p className="text-2xl font-bold text-primary">${Number(product.priceUsd ?? 0).toFixed(2)}</p>
        </div>

        {product.description ? <p className="leading-relaxed text-muted-foreground">{product.description}</p> : null}

        <div className="rounded-xl border border-border bg-card p-4 text-sm text-card-foreground">
          <p>
            <span className="text-muted-foreground">Category:</span> {product.category ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Gender:</span> {product.gender ?? "—"}
          </p>
        </div>

        {authRequired ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Sign in is required to add this product to your cart.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <form action={addToCart} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <select
              name="measurementId"
              defaultValue=""
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">No measurement selected</option>
              {measurements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label ?? "My Measurements"}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Add to Cart
            </button>
          </form>
          <Link href="/catalog" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            Back to Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
