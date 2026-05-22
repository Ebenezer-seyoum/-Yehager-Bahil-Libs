import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ChevronRight, Users } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  gender?: string | null;
  uniqueId?: string | null;
  fabricType?: string | null;
  embroideryStyle?: string | null;
  priceUsd?: number | null;
  images?: string[] | null;
  familyRoles?: Array<{ label: string; icon?: string; price: number; gender: "male" | "female" | "unisex" }> | null;
  isCouple?: boolean | null;
  groomPriceUsd?: number | null;
};

type Measurement = {
  id: string;
  label?: string | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulderWidth?: number | null;
  armLength?: number | null;
  torsoLength?: number | null;
};

type Event = {
  id: string;
  name: string;
  ownerName?: string | null;
};

function buildStorefrontRoles(product: Product, price: number) {
  if (product.familyRoles && product.familyRoles.length > 0) return product.familyRoles;

  const name = `${product.name} ${product.category ?? ""}`.toLowerCase();
  const isFamilyOutfit = name.includes("family") || Boolean(product.groomPriceUsd) || product.isCouple;
  if (!isFamilyOutfit) return [];

  const menPrice = Number(product.groomPriceUsd ?? 0) > 0 ? Number(product.groomPriceUsd) : Math.max(1, Math.round(price * 0.57));
  const kidsPrice = Math.max(1, Math.round(price * 0.43));
  return [
    { label: "Women", icon: "👩", price, gender: "female" as const },
    { label: "Men", icon: "👨", price: menPrice, gender: "male" as const },
    { label: "Kids", icon: "👧", price: kidsPrice, gender: "unisex" as const },
  ];
}

function signinRedirect(path: string) {
  redirect(`/signin?callbackUrl=${encodeURIComponent(path)}`);
}

function cmToInches(value: FormDataEntryValue | null) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.round((num / 2.54) * 10) / 10;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const authRequired = query?.auth === "required";

  async function addToCart(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") ?? "");
    const callbackPath = `/product/${productId}`;
    await ensureBackendUserSynced();
    const measurementIdRaw = String(formData.get("measurementId") ?? "");
    const measurementId = measurementIdRaw.length > 0 ? measurementIdRaw : undefined;
    const eventIdRaw = String(formData.get("eventId") ?? "");
    const eventId = eventIdRaw.length > 0 ? eventIdRaw : undefined;
    const roleLabelRaw = String(formData.get("roleLabel") ?? "");
    const roleLabel = roleLabelRaw.length > 0 ? roleLabelRaw : undefined;

    let ok = false;
    try {
      await apiRequest("/api/v1/cart", {
        method: "POST",
        body: { productId, quantity: 1, measurementId, eventId, roleLabel },
      });
      ok = true;
    } catch {}

    if (!ok) signinRedirect(`${callbackPath}?auth=required`);
    revalidatePath("/cart");
    redirect("/cart");
  }

  async function createMeasurement(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") ?? "");
    await ensureBackendUserSynced();
    let ok = false;
    try {
      await apiRequest("/api/v1/measurements", {
        method: "POST",
        body: {
          label: String(formData.get("label") ?? "My Measurements"),
          gender: String(formData.get("gender") ?? "female"),
          chest: cmToInches(formData.get("chest")),
          waist: cmToInches(formData.get("waist")),
          hips: cmToInches(formData.get("hips")),
          shoulderWidth: cmToInches(formData.get("shoulderWidth")),
          armLength: cmToInches(formData.get("armLength")),
          torsoLength: cmToInches(formData.get("torsoLength")),
          inseam: cmToInches(formData.get("inseam")),
          neck: cmToInches(formData.get("neck")),
        },
      });
      ok = true;
    } catch {}

    if (!ok) signinRedirect(`/product/${productId}?auth=required`);
    revalidatePath(`/product/${productId}`);
    redirect(`/product/${productId}`);
  }

  async function createEventFromProduct(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") ?? "");
    const productName = String(formData.get("productName") ?? "");
    const name = String(formData.get("eventName") ?? "").trim();
    if (!name) return;
    await ensureBackendUserSynced();

    let response: { data: { id: string } } | null = null;
    try {
      response = await apiRequest<{ data: { id: string } }>("/api/v1/events", {
        method: "POST",
        body: {
          name,
          productId,
          productName,
        },
      });
    } catch {}
    const eventId = response?.data?.id;
    if (!eventId) signinRedirect(`/product/${productId}`);
    redirect(`/event/${eventId}`);
  }

  let product: Product | null = null;
  let measurements: Measurement[] = [];
  let etbRate: number | null = null;
  let event: Event | null = null;
  let isAuthenticated = false;

  try {
    const response = await backendPublicRequest(`/api/v1/products/${id}`);
    product = response?.data ?? null;
  } catch {
    product = null;
  }

  try {
    const rate = await backendPublicRequest("/api/v1/exchange-rate");
    etbRate = Number(rate?.data?.rate ?? 0) || null;
  } catch {
    etbRate = null;
  }

  try {
    await ensureBackendUserSynced();
    const response = await apiRequest<{ data: Measurement[] }>("/api/v1/measurements");
    measurements = Array.isArray(response?.data) ? response.data : [];
    isAuthenticated = true;
  } catch {
    measurements = [];
    isAuthenticated = false;
  }

  const eventId = typeof query?.event === "string" ? query.event : "";
  if (eventId) {
    try {
      const response = await backendPublicRequest(`/api/v1/events/${eventId}`);
      event = response?.data ?? null;
    } catch {
      event = null;
    }
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const price = Number(product.priceUsd ?? 0);
  const roles = buildStorefrontRoles(product, price);
  const latestMeasurement = measurements[0] ?? null;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-12 xl:px-20 sm:py-12">
      <div className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/catalog" className="hover:text-foreground">
          Collection
        </Link>
        {product.region ? (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/catalog?region=${encodeURIComponent(product.region)}`} className="hover:text-foreground">
              {product.region}
            </Link>
          </>
        ) : null}
        <ChevronRight className="h-3 w-3" />
        <span className="max-w-[150px] truncate text-foreground">{product.name}</span>
      </div>

      {event ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Group Participation</p>
            <p className="text-sm font-medium">
              You are joining: {event.ownerName ? `${event.ownerName}'s ` : ""}
              {event.name}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 xl:gap-24">
        <ProductDetailGallery images={images} alt={product.name} />

        <ProductPurchasePanel
          product={product}
          roles={roles}
          price={price}
          etbRate={etbRate}
          measurements={measurements}
          latestMeasurement={latestMeasurement}
          eventId={eventId}
          event={event}
          isAuthenticated={isAuthenticated}
          authRequired={authRequired}
          shareUrl={`${process.env.NEXTAUTH_URL ?? ""}/product/${product.id}`}
          addToCartAction={addToCart}
          createMeasurementAction={createMeasurement}
          createEventAction={createEventFromProduct}
        />
      </div>
    </div>
  );
}
