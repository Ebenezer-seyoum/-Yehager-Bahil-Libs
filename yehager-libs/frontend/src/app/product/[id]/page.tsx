import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { ShareLinks } from "@/components/share-links";
import { MeasurementHelp } from "@/components/measurement-help";
import { ChevronRight, Clock, ShoppingBag, Users } from "lucide-react";

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
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    const measurementIdRaw = String(formData.get("measurementId") ?? "");
    const measurementId = measurementIdRaw.length > 0 ? measurementIdRaw : undefined;
    const eventIdRaw = String(formData.get("eventId") ?? "");
    const eventId = eventIdRaw.length > 0 ? eventIdRaw : undefined;
    const roleLabelRaw = String(formData.get("roleLabel") ?? "");
    const roleLabel = roleLabelRaw.length > 0 ? roleLabelRaw : undefined;

    try {
      await apiRequest("/api/v1/cart", {
        method: "POST",
        body: { productId, quantity: 1, measurementId, eventId, roleLabel },
      });
      revalidatePath("/cart");
      redirect("/cart");
    } catch {
      redirect(`/product/${productId}?auth=required`);
    }
  }

  async function createMeasurement(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    await apiRequest("/api/v1/measurements", {
      method: "POST",
      body: {
        label: String(formData.get("label") ?? "My Measurements"),
        gender: String(formData.get("gender") ?? "female"),
        chest: Number(formData.get("chest")),
        waist: Number(formData.get("waist")),
        hips: Number(formData.get("hips")),
        shoulderWidth: Number(formData.get("shoulderWidth")),
        armLength: Number(formData.get("armLength")),
        torsoLength: Number(formData.get("torsoLength")),
        inseam: formData.get("inseam") ? Number(formData.get("inseam")) : undefined,
        neck: formData.get("neck") ? Number(formData.get("neck")) : undefined,
      },
    });
    revalidatePath(`/product/${productId}`);
    redirect(`/product/${productId}`);
  }

  async function createEventFromProduct(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();
    const productId = String(formData.get("productId") ?? "");
    const productName = String(formData.get("productName") ?? "");
    const name = String(formData.get("eventName") ?? "").trim();
    if (!name) return;

    const response = await apiRequest<{ data: { id: string } }>("/api/v1/events", {
      method: "POST",
      body: {
        name,
        productId,
        productName,
      },
    });
    redirect(`/event/${response.data.id}`);
  }

  let product: Product | null = null;
  let measurements: Measurement[] = [];
  let etbRate: number | null = null;
  let event: Event | null = null;

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
  } catch {
    measurements = [];
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
  const roles =
    product.familyRoles && product.familyRoles.length > 0
      ? product.familyRoles
      : product.isCouple && product.groomPriceUsd
        ? [
            { label: "Bride", price, gender: "female" as const },
            { label: "Groom", price: Number(product.groomPriceUsd), gender: "male" as const },
          ]
        : [];
  const selectedRole = roles[0] ?? null;
  const displayPrice = Number(selectedRole?.price ?? price);
  const measurementGender = selectedRole?.gender ?? product.gender ?? "female";
  const latestMeasurement = measurements[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-12 xl:px-20 sm:py-12">
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

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {product.region ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{product.region}</span> : null}
            {product.subcategory ? <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{product.subcategory}</span> : null}
            {product.uniqueId ? <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground">#{product.uniqueId}</span> : null}
          </div>

          <div>
            <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-3">
              <p className="text-3xl font-light text-primary">${displayPrice.toFixed(2)}</p>
              {etbRate ? <p className="mt-0.5 text-sm text-muted-foreground">~ {(displayPrice * etbRate).toLocaleString()} ETB</p> : null}
            </div>
          </div>

          {roles.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select outfit</h3>
              <div className={`grid gap-2 ${roles.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : roles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {roles.map((role, index) => (
                  <label key={role.label} className="cursor-pointer">
                    <input className="peer sr-only" type="radio" name="roleChoicePreview" defaultChecked={index === 0} />
                    <span className="block rounded-xl border-2 border-border bg-secondary p-3 text-left transition-colors peer-checked:border-primary peer-checked:bg-primary/10">
                      <span className="block text-sm font-semibold">{role.icon ? `${role.icon} ` : "👤 "}{role.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">${Number(role.price).toFixed(2)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {product.description ? <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Garment details</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {product.fabricType ? (
                <div className="rounded-xl bg-secondary p-3">
                  <p className="mb-0.5 text-muted-foreground">Fabric</p>
                  <p className="font-semibold">{product.fabricType}</p>
                </div>
              ) : null}
              {product.embroideryStyle ? (
                <div className="rounded-xl bg-secondary p-3">
                  <p className="mb-0.5 text-muted-foreground">Design name</p>
                  <p className="font-semibold">{product.embroideryStyle}</p>
                </div>
              ) : null}
              <div className="rounded-xl bg-secondary p-3">
                <p className="mb-0.5 text-muted-foreground">Origin</p>
                <p className="font-semibold">Handcrafted in Ethiopia</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="mb-0.5 text-muted-foreground">Fit type</p>
                <p className="font-semibold">Traditional Cut</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="mb-0.5 text-muted-foreground">Gender</p>
                <p className="font-semibold">{product.gender ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Production to delivery time</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Each piece is made to order and typically ships after tailoring and quality review.{" "}
                <Link href="/care-and-info" className="underline hover:text-amber-900">
                  Learn more
                </Link>
              </p>
            </div>
          </div>

          {authRequired ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Sign in is required to add this product to your cart.
            </div>
          ) : null}

          {!event ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Create an event from this outfit</p>
              <p className="mt-1 text-xs text-muted-foreground">Start a wedding, baptism, or celebration group around this look.</p>
              <form action={createEventFromProduct} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="productName" value={product.name} />
                <input name="eventName" required placeholder="Event name" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
                <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
                  Create Event
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Continue event flow</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/event/${event.id}`} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                  View Event Dashboard
                </Link>
                <Link href={`/join/${event.id}`} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                  Invite Participants
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Add measurements</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a measurement profile here, then select it above before adding to cart.</p>
            {latestMeasurement ? (
              <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Your Measurements</p>
                  <span className="text-xs text-muted-foreground">{latestMeasurement.label ?? "My Measurements"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Chest", latestMeasurement.chest],
                    ["Waist", latestMeasurement.waist],
                    ["Hips", latestMeasurement.hips],
                    ["Shoulder", latestMeasurement.shoulderWidth],
                    ["Arm", latestMeasurement.armLength],
                    ["Torso", latestMeasurement.torsoLength],
                  ].map(([label, value]) => (
                    <div key={label} className="text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="ml-1 font-medium">{value ?? "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4">
              <MeasurementHelp gender={measurementGender} />
            </div>
            <form action={createMeasurement} className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <input type="hidden" name="productId" value={product.id} />
              <label className="col-span-2">
                <span className="mb-1 block text-muted-foreground">Label</span>
                <input name="label" defaultValue="My Measurements" className="h-10 w-full rounded-md border border-input bg-background px-3" />
              </label>
              <label className="col-span-2">
                <span className="mb-1 block text-muted-foreground">Gender</span>
                <select name="gender" defaultValue="female" className="h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="unisex">unisex</option>
                </select>
              </label>
              {[
                ["chest", "Chest"],
                ["waist", "Waist"],
                ["hips", "Hips"],
                ["shoulderWidth", "Shoulder Width"],
                ["armLength", "Arm Length"],
                ["torsoLength", "Torso Length"],
                ["inseam", "Inseam (optional)"],
                ["neck", "Neck (optional)"],
              ].map(([name, label]) => (
                <label key={name}>
                  <span className="mb-1 block text-muted-foreground">{label}</span>
                  <input
                    name={name}
                    type="number"
                    step="0.01"
                    required={!["inseam", "neck"].includes(name)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3"
                  />
                </label>
              ))}
              <button type="submit" className="col-span-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                Save Measurement
              </button>
            </form>
          </div>

          <form action={addToCart} className="flex gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="roleLabel" value={roles[0]?.label ?? ""} />
            <select name="measurementId" defaultValue={latestMeasurement?.id ?? ""} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">No measurement selected</option>
              {measurements.map((measurement) => (
                <option key={measurement.id} value={measurement.id}>
                  {measurement.label ?? "My Measurements"}
                </option>
              ))}
            </select>
            <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </button>
          </form>

          <ShareLinks url={`${process.env.NEXTAUTH_URL ?? ""}/product/${product.id}`} title={`Check out ${product.name}`} />
        </div>
      </div>
    </div>
  );
}
