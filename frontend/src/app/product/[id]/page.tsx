import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
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
  baseCurrency?: "USD" | "ETB" | null;
  effectivePriceUsd?: number | string | null;
  finalPriceUsd?: number | string | null;
  originalPriceUsd?: number | string | null;
  discount?: { label?: string | null } | null;
  images?: string[] | null;
  familyRoles?: Array<{
    label: string;
    icon?: string;
    price: number;
    currency?: "USD" | "ETB";
    gender: "male" | "female" | "unisex";
    customerType?: "woman" | "man" | "girl" | "boy";
    outfitOption?: "standard" | "full_set" | "top_only" | "pants_only";
    description?: string;
    designerCostUsd?: number;
    taxPercent?: number;
    otherCostUsd?: number;
  }> | null;
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
  if (!isFamilyOutfit) {
    return [
      { label: "Women's Traditional Outfit", price, gender: "female" as const, customerType: "woman" as const, outfitOption: "standard" as const, description: "Traditional outfit for women" },
    ];
  }

  const menPrice = Number(product.groomPriceUsd ?? 0);
  return menPrice > 0
    ? [
        { label: "Women's Traditional Outfit", price, gender: "female" as const, customerType: "woman" as const, outfitOption: "standard" as const, description: "Traditional outfit for women" },
        { label: "Men's Traditional Full Set", price: menPrice, gender: "male" as const, customerType: "man" as const, outfitOption: "full_set" as const, description: "Traditional top and pants" },
      ]
    : [{ label: "Women's Traditional Outfit", price, gender: "female" as const, customerType: "woman" as const, outfitOption: "standard" as const, description: "Traditional outfit for women" }];
}

function signinRedirect(path: string) {
  redirect(`/signin?callbackUrl=${encodeURIComponent(path)}`);
}

function toOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseMeasurementSnapshot(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function isAuthApiError(error: unknown) {
  return error instanceof Error && (/API error 401:/i.test(error.message) || /No authenticated user found/i.test(error.message));
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      signinRedirect(callbackPath);
    }

    const measurementIdRaw = String(formData.get("measurementId") ?? "");
    const measurementSnapshot = parseMeasurementSnapshot(formData.get("measurementSnapshotJson"));
    const measurementId = measurementSnapshot ? undefined : measurementIdRaw.length > 0 ? measurementIdRaw : undefined;
    const eventIdRaw = String(formData.get("eventId") ?? "");
    const eventId = eventIdRaw.length > 0 ? eventIdRaw : undefined;
    const roleLabelRaw = String(formData.get("roleLabel") ?? "");
    const roleLabel = roleLabelRaw.length > 0 ? roleLabelRaw : undefined;

    try {
      await ensureBackendUserSynced();
      await apiRequest("/api/v1/cart", {
        method: "POST",
        body: { productId, quantity: 1, measurementId, measurementSnapshot, eventId, roleLabel },
      });
    } catch (error) {
      if (isAuthApiError(error)) signinRedirect(`${callbackPath}?auth=required`);
      redirect(`${callbackPath}?cartError=add_failed`);
    }
    revalidatePath("/cart");
    redirect("/cart");
  }

  async function createMeasurement(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") ?? "");
    await ensureBackendUserSynced();
    const measurementId = String(formData.get("measurementId") ?? "").trim();
    const body = {
      label: String(formData.get("label") ?? "My Measurements"),
      gender: String(formData.get("gender") ?? "female"),
      chest: Number(formData.get("chest")),
      waist: Number(formData.get("waist")),
      hips: Number(formData.get("hips") || formData.get("pantsHip")), // Compatibility with both field names
      shoulderWidth: Number(formData.get("shoulderWidth")),
      armLength: Number(formData.get("armLength")),
      torsoLength: Number(formData.get("torsoLength")),
      neck: toOptionalNumber(formData.get("neck")),
      bicepCircumference: toOptionalNumber(formData.get("bicepCircumference")),
      wristCircumference: toOptionalNumber(formData.get("wristCircumference")),
      pantsWaist: toOptionalNumber(formData.get("pantsWaist")),
      pantsHip: toOptionalNumber(formData.get("pantsHip")),
      thighCircumference: toOptionalNumber(formData.get("thighCircumference")),
      waistToPantsLength: toOptionalNumber(formData.get("waistToPantsLength")),
      hemStyle: String(formData.get("hemStyle") ?? "Straight"),
      pressingStyle: String(formData.get("pressingStyle") ?? "Creased"),
      tailorNote: String(formData.get("tailorNote") ?? ""),
      inseam: toOptionalNumber(formData.get("inseam")),
    };
    try {
      const response = await apiRequest<{ data: Measurement }>(measurementId ? `/api/v1/measurements/${measurementId}` : "/api/v1/measurements", {
        method: measurementId ? "PATCH" : "POST",
        body,
      });
      revalidatePath(`/product/${productId}`);
      return response.data;
    } catch (error) {
      if (isAuthApiError(error)) {
        signinRedirect(`/product/${productId}?auth=required`);
      }
      return;
    }
    return null;
  }

  async function createEventFromProduct(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") ?? "");
    const productName = String(formData.get("productName") ?? "");
    const name = String(formData.get("groupName") ?? formData.get("eventName") ?? "").trim();
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

  async function createGroupFromProduct(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    const groupName = String(formData.get("groupName") ?? "").trim();
    if (!groupName) return;
    const response = await apiRequest<{ data: { id: string } }>("/api/v1/family-groups", {
      method: "POST",
      body: { groupName, groupType: "family_group", productId },
    });
    redirect(`/family-group/${response.data.id}`);
  }

  async function selectForSharedOrder(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    const selectionMode = String(formData.get("selectionMode") ?? "");
    const groupId = String(formData.get("groupId") ?? "");
    const forceChange = String(formData.get("forceChange") ?? "") === "1";
    const eventId = String(formData.get("eventId") ?? "");
    if (selectionMode === "group" && groupId) {
      await apiRequest(`/api/v1/family-groups/${groupId}`, { method: "PATCH", body: { productId, forceChange } });
      revalidatePath(`/family-group/${groupId}`);
      redirect(`/family-group/${groupId}?selected=catalog`);
    }
    if (selectionMode === "event" && eventId) {
      await apiRequest(`/api/v1/events/${eventId}`, { method: "PATCH", body: { productId } });
      revalidatePath(`/event/${eventId}`);
      redirect(`/event/${eventId}?selected=catalog`);
    }
  }

  let product: Product | null = null;
  let measurements: Measurement[] = [];
  let etbRate: number | null = null;
  let event: Event | null = null;
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user?.id);

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

  if (isAuthenticated) {
    try {
      await ensureBackendUserSynced();
      const response = await apiRequest<{ data: Measurement[] }>("/api/v1/measurements");
      measurements = Array.isArray(response?.data) ? response.data : [];
    } catch {
      measurements = [];
    }
  }

  const eventId = typeof query?.event === "string" ? query.event : "";
  const selectionMode = typeof query?.selectionMode === "string" ? query.selectionMode : "";
  const selectionGroupId = typeof query?.groupId === "string" ? query.groupId : "";
  const selectionEventId = typeof query?.eventId === "string" ? query.eventId : "";
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
  const price = Number(product.effectivePriceUsd ?? product.finalPriceUsd ?? product.priceUsd ?? 0);
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
          Catalog
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

      {selectionMode ? (
        <form action={selectForSharedOrder} className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-900/20 bg-blue-50 p-4 text-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="selectionMode" value={selectionMode} />
          <input type="hidden" name="groupId" value={selectionGroupId} />
          <input type="hidden" name="forceChange" value={query?.changeSelection === "1" ? "1" : "0"} />
          <input type="hidden" name="eventId" value={selectionEventId} />
          <div>
            <p className="font-semibold">Use this catalog product for your {selectionMode === "event" ? "Event Match-Up" : "Group Order"}?</p>
            <p className="text-sm text-slate-600">This selection becomes the shared outfit for every member.</p>
          </div>
          <button type="submit" className="rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
            Select This Product
          </button>
        </form>
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
          cartError={query?.cartError === "add_failed" ? "We could not add this item to cart. Please check the selected outfit and measurements, then try again." : null}
          shareUrl={`${process.env.NEXTAUTH_URL ?? ""}/product/${product.id}`}
          addToCartAction={addToCart}
          createMeasurementAction={createMeasurement}
          createEventAction={createEventFromProduct}
          createGroupAction={createGroupFromProduct}
        />
      </div>
    </div>
  );
}
