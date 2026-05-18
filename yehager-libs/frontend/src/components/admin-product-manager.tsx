"use client";

import { useMemo, useState } from "react";
import { TAXONOMY, REGIONS } from "@/lib/taxonomy";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  region: string;
  subcategory?: string | null;
  category?: string | null;
  priceUsd: string | number;
  groomPriceUsd?: string | number | null;
  gender: "male" | "female" | "unisex";
  images?: string[];
  fabricType?: string | null;
  embroideryStyle?: string | null;
  tailoringDays?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
};

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

const emptyDraft = {
  name: "",
  description: "",
  region: REGIONS[0],
  subcategory: TAXONOMY[REGIONS[0]]?.[0] ?? "",
  category: "",
  priceUsd: "",
  groomPriceUsd: "",
  gender: "female",
  fabricType: "",
  embroideryStyle: "",
  tailoringDays: "30",
  imagesText: "",
  isActive: true,
  isFeatured: false,
};

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function AdminProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const subsections = TAXONOMY[draft.region] ?? [];
  const previewImages = parseImages(draft.imagesText);

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !needle ||
        [product.name, product.region, product.subcategory, product.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesRegion = regionFilter === "all" || product.region === regionFilter;
      return matchesSearch && matchesRegion;
    });
  }, [products, regionFilter, search]);

  async function createProduct() {
    setBusy("create");
    setError(null);
    try {
      const response = await fetch("/api/backend/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          priceUsd: Number(draft.priceUsd),
          groomPriceUsd: draft.groomPriceUsd ? Number(draft.groomPriceUsd) : null,
          tailoringDays: Number(draft.tailoringDays),
          images: previewImages,
        }),
      });
      if (!response.ok) throw new Error("Could not create product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => [payload.data!, ...current]);
        setDraft(emptyDraft);
        setPreviewOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Each image must be 10MB or smaller");
        }

        const signResponse = await fetch("/api/backend/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "products" }),
        });
        if (!signResponse.ok) throw new Error("Could not prepare image upload");
        const signedPayload = (await signResponse.json()) as { data?: SignedUpload };
        const signed = signedPayload.data;
        if (!signed) throw new Error("Could not prepare image upload");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signed.apiKey);
        formData.append("timestamp", String(signed.timestamp));
        formData.append("signature", signed.signature);
        formData.append("folder", signed.folder);
        if (signed.publicId) formData.append("public_id", signed.publicId);

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error("Image upload failed");
        const uploaded = (await uploadResponse.json()) as { secure_url?: string };
        if (!uploaded.secure_url) throw new Error("Image upload failed");
        uploadedUrls.push(uploaded.secure_url);
      }

      setDraft((current) => ({
        ...current,
        imagesText: [...parseImages(current.imagesText), ...uploadedUrls].join("\n"),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function setImages(images: string[]) {
    setDraft((current) => ({
      ...current,
      imagesText: images.join("\n"),
    }));
  }

  async function updateProduct(product: Product, patch: Partial<Product>) {
    setBusy(product.id);
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Could not update product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((item) => (item.id === product.id ? payload.data! : item)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product");
    } finally {
      setBusy(null);
    }
  }

  async function archiveProduct(product: Product) {
    setBusy(product.id);
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not archive product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((item) => (item.id === product.id ? payload.data! : item)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive product");
    } finally {
      setBusy(null);
    }
  }

  function beginEdit(product: Product) {
    setEditingProductId(product.id);
    setDraft({
      name: product.name ?? "",
      description: product.description ?? "",
      region: product.region,
      subcategory: product.subcategory ?? "",
      category: product.category ?? "",
      priceUsd: String(product.priceUsd ?? ""),
      groomPriceUsd: String(product.groomPriceUsd ?? ""),
      gender: product.gender ?? "female",
      fabricType: product.fabricType ?? "",
      embroideryStyle: product.embroideryStyle ?? "",
      tailoringDays: String(product.tailoringDays ?? 30),
      imagesText: (product.images ?? []).join("\n"),
      isActive: Boolean(product.isActive),
      isFeatured: Boolean(product.isFeatured),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEditedProduct() {
    if (!editingProductId) return;
    const existing = products.find((product) => product.id === editingProductId);
    if (!existing) return;

    setBusy("edit");
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/products/${editingProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          priceUsd: Number(draft.priceUsd),
          groomPriceUsd: draft.groomPriceUsd ? Number(draft.groomPriceUsd) : null,
          tailoringDays: Number(draft.tailoringDays),
          images: previewImages,
        }),
      });
      if (!response.ok) throw new Error("Could not update product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((product) => (product.id === editingProductId ? payload.data! : product)));
        setEditingProductId(null);
        setDraft(emptyDraft);
        setPreviewOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-primary">{editingProductId ? "Edit Product" : "Add Product"}</p>
          <h2 className="mt-2 text-xl font-semibold">{editingProductId ? "Update catalog item" : "Create catalog item"}</h2>
          <div className="mt-5 space-y-4">
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Product name"
              className="h-11 w-full rounded-xl border border-input bg-background px-3"
            />
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Product details"
              className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={draft.region}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    region: event.target.value,
                    subcategory: TAXONOMY[event.target.value]?.[0] ?? "",
                  }))
                }
                className="h-11 rounded-xl border border-input bg-background px-3"
              >
                {REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
              <select
                value={draft.subcategory}
                onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))}
                className="h-11 rounded-xl border border-input bg-background px-3"
              >
                <option value="">No subsection</option>
                {subsections.map((subsection) => (
                  <option key={subsection}>{subsection}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="Category"
                className="h-11 rounded-xl border border-input bg-background px-3"
              />
              <select
                value={draft.gender}
                onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value }))}
                className="h-11 rounded-xl border border-input bg-background px-3"
              >
                <option value="female">female</option>
                <option value="male">male</option>
                <option value="unisex">unisex</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={draft.priceUsd}
                onChange={(event) => setDraft((current) => ({ ...current, priceUsd: event.target.value }))}
                placeholder="Price USD"
                type="number"
                min="0"
                className="h-11 rounded-xl border border-input bg-background px-3"
              />
              <input
                value={draft.tailoringDays}
                onChange={(event) => setDraft((current) => ({ ...current, tailoringDays: event.target.value }))}
                placeholder="Tailoring days"
                type="number"
                min="1"
                className="h-11 rounded-xl border border-input bg-background px-3"
              />
            </div>
            <textarea
              value={draft.imagesText}
              onChange={(event) => setDraft((current) => ({ ...current, imagesText: event.target.value }))}
              placeholder="Paste image URLs, one per line. Use 4 lines for 4 product poses."
              className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2"
            />
            <label className="block rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm">
              <span className="block font-medium">Upload product images</span>
              <span className="mt-1 block text-muted-foreground">
                Select multiple images for one product pose set. JPG, PNG, or WebP up to 10MB each.
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(event) => void uploadFiles(event.target.files)}
                className="mt-3 block w-full text-sm"
              />
              {uploading ? <span className="mt-2 block text-primary">Uploading images...</span> : null}
            </label>
            {previewImages.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {previewImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="rounded-2xl border border-border bg-background/60 p-2">
                    <img src={image} alt="" className="aspect-[4/5] w-full rounded-xl object-cover" />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] ${index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        {index === 0 ? "Primary image" : `Pose ${index + 1}`}
                      </span>
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => setImages(moveItem(previewImages, index, 0))}
                          className="rounded-lg border border-border px-2 py-1 text-[11px]"
                        >
                          Make primary
                        </button>
                      ) : null}
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => setImages(moveItem(previewImages, index, index - 1))}
                          className="rounded-lg border border-border px-2 py-1 text-[11px]"
                        >
                          Move up
                        </button>
                      ) : null}
                      {index < previewImages.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setImages(moveItem(previewImages, index, index + 1))}
                          className="rounded-lg border border-border px-2 py-1 text-[11px]"
                        >
                          Move down
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setImages(previewImages.filter((_, imageIndex) => imageIndex !== index))}
                        className="rounded-lg border border-destructive/40 px-2 py-1 text-[11px] text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.checked }))}
                />
                Featured
              </label>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              {editingProductId ? "Preview changes" : "Preview product"}
            </button>
            {editingProductId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setDraft(emptyDraft);
                }}
                className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3"
            />
            <select
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3"
            >
              <option value="all">All sections</option>
              {REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <article key={product.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-4">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {product.region}
                          {product.subcategory ? ` · ${product.subcategory}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-primary">{formatCurrency(product.priceUsd)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(product.isActive)}
                          disabled={busy === product.id}
                          onChange={(event) => void updateProduct(product, { isActive: event.target.checked })}
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(product.isFeatured)}
                          disabled={busy === product.id}
                          onChange={(event) => void updateProduct(product, { isFeatured: event.target.checked })}
                        />
                        Featured
                      </label>
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => beginEdit(product)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => void archiveProduct(product)}
                        className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">{draft.name || "Untitled product"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {draft.region}
                  {draft.subcategory ? ` · ${draft.subcategory}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border border-border px-3 py-2 text-sm">
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <div className="grid grid-cols-2 gap-3">
                {previewImages.length === 0 ? (
                  <div className="col-span-2 rounded-2xl bg-secondary p-10 text-center text-sm text-muted-foreground">No images yet</div>
                ) : (
                  previewImages.map((image) => <img key={image} src={image} alt="" className="aspect-[2/3] w-full rounded-2xl object-cover" />)
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{formatCurrency(draft.priceUsd)}</p>
                </div>
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="mt-2 text-sm">{draft.description || "No description yet."}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === "create" || busy === "edit"}
                  onClick={() => void (editingProductId ? saveEditedProduct() : createProduct())}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {editingProductId
                    ? busy === "edit"
                      ? "Saving..."
                      : "Save changes"
                    : busy === "create"
                      ? "Creating..."
                      : "Submit product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
