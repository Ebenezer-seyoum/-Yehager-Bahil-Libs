"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Pencil,
  Power,
  Save,
  Star,
  Trash2,
  X,
  RefreshCw,
  Package,
  ShieldCheck,
  Upload,
  Info,
  DollarSign,
  Shirt,
  ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  region: string;
  subcategory?: string | null;
  uniqueId?: string | null;
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

type TabKey = "info" | "pricing" | "garment" | "storefront" | "images";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "info", label: "Product Information", icon: <Info className="h-4 w-4" /> },
  { key: "pricing", label: "Pricing & Cost", icon: <DollarSign className="h-4 w-4" /> },
  { key: "garment", label: "Garment Specs", icon: <Shirt className="h-4 w-4" /> },
  { key: "storefront", label: "Storefront Controls", icon: <ShieldCheck className="h-4 w-4" /> },
  { key: "images", label: "Images Manager", icon: <ImageIcon className="h-4 w-4" /> },
];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatEtb(value: string | number | null | undefined) {
  const amount = Number(value) * 156.16;
  if (!Number.isFinite(amount)) return "0 ETB";
  return `${Math.round(amount).toLocaleString()} ETB`;
}

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFromProduct(product: Product) {
  return {
    name: product.name ?? "",
    description: product.description ?? "",
    priceUsd: String(product.priceUsd ?? ""),
    groomPriceUsd: String(product.groomPriceUsd ?? ""),
    gender: product.gender ?? "female",
    fabricType: product.fabricType ?? "",
    embroideryStyle: product.embroideryStyle ?? "",
    tailoringDays: String(product.tailoringDays ?? 30),
    imagesText: (product.images ?? []).join("\n"),
  };
}

export function AdminProductDetailPanel({
  product: initialProduct,
  canEdit = false,
  canDelete = false,
}: {
  product: Product;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const swalTargetRef = useRef<HTMLDivElement | null>(null);
  const [product, setProduct] = useState(initialProduct);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(initialProduct.images?.[0] ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(draftFromProduct(initialProduct));
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const images = product.images?.filter(Boolean) ?? [];
  const activeImage = images.includes(selectedImage) ? selectedImage : images[0] ?? "";

  const nameParts = (product.name || "").split(" — ");
  const cleanProductName = nameParts[0];
  const displayUniqueId = product.uniqueId || (nameParts.length > 1 ? nameParts[1] : product.id.slice(0, 8).toUpperCase());

  function isDirty() {
    const original = draftFromProduct(product);
    return (
      original.name !== draft.name ||
      original.description !== draft.description ||
      original.priceUsd !== draft.priceUsd ||
      original.groomPriceUsd !== draft.groomPriceUsd ||
      original.gender !== draft.gender ||
      original.fabricType !== draft.fabricType ||
      original.embroideryStyle !== draft.embroideryStyle ||
      original.tailoringDays !== draft.tailoringDays ||
      original.imagesText !== draft.imagesText
    );
  }

  async function cancelEditMode() {
    if (isDirty()) {
      const confirmed = await dashboardConfirm({
        title: "Discard changes?",
        text: "Your unsaved changes will be lost.",
        confirmButtonText: "Discard",
        cancelButtonText: "Continue Editing",
        tone: "warning",
        icon: "warning",
      });
      if (!confirmed) return;
    }
    setEditing(false);
    setDraft(draftFromProduct(product));
  }

  async function confirmAction(title: string, text: string, confirmButtonText: string, icon: "warning" | "question" = "warning") {
    return dashboardConfirm({
      title,
      text,
      confirmButtonText,
      cancelButtonText: "No, cancel",
      tone: confirmButtonText.toLowerCase().includes("delete") ? "danger" : "success",
      icon,
    });
  }

  function showResult(type: "success" | "error", message: string) {
    void (type === "success" ? dashboardSuccess("Success", message) : dashboardError("Something went wrong", message));
  }

  async function patchProduct(patch: Partial<Product>, successMessage: string) {
    if (!canEdit) {
      showResult("error", "You do not have permission to edit products.");
      return;
    }
    setBusy("patch");
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Product update failed");
      }
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProduct(payload.data);
        setDraft(draftFromProduct(payload.data));
        setSelectedImage(payload.data.images?.[0] ?? "");
      }
      showResult("success", successMessage);
      router.refresh();
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Product update failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive() {
    if (!canEdit) return;
    const nextActive = !product.isActive;
    const confirmed = await confirmAction(
      nextActive ? "Activate product?" : "Deactivate product?",
      nextActive ? "This product will become visible to customers." : "This product will be hidden from customers.",
      nextActive ? "Activate" : "Deactivate",
    );
    if (confirmed) await patchProduct({ isActive: nextActive }, nextActive ? "Product activated successfully." : "Product deactivated successfully.");
  }

  async function toggleFeatured() {
    if (!canEdit) return;
    const nextFeatured = !product.isFeatured;
    const confirmed = await confirmAction(
      nextFeatured ? "Feature product?" : "Remove feature?",
      nextFeatured ? "This product can be highlighted on the home page." : "This product will no longer be highlighted.",
      nextFeatured ? "Feature" : "Remove feature",
      "question",
    );
    if (confirmed) await patchProduct({ isFeatured: nextFeatured }, nextFeatured ? "Product featured successfully." : "Product feature removed successfully.");
  }

  async function deleteProduct() {
    if (!canDelete) {
      showResult("error", "You do not have permission to delete products.");
      return;
    }
    const confirmed = await confirmAction(
      "Delete product?",
      "This will hide the product from the storefront. You can manage archived products from the backend records.",
      "Delete",
    );
    if (!confirmed) return;
    setBusy("delete");
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Product delete failed");
      }
      await dashboardSuccess("Deleted", "Product deleted successfully.");
      router.push("/admin/inventory");
      router.refresh();
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Product delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!canEdit) return;
    const confirmed = await confirmAction("Save product changes?", "This will update the product information shown in admin and storefront.", "Save", "question");
    if (!confirmed) return;
    await patchProduct(
      {
        name: draft.name,
        description: draft.description,
        priceUsd: Number(draft.priceUsd),
        groomPriceUsd: draft.groomPriceUsd ? Number(draft.groomPriceUsd) : null,
        gender: draft.gender as Product["gender"],
        fabricType: draft.fabricType,
        embroideryStyle: draft.embroideryStyle,
        tailoringDays: Number(draft.tailoringDays),
        images: parseImages(draft.imagesText),
      },
      "Product updated successfully.",
    );
    setEditing(false);
  }

  async function uploadOneImage(file: File) {
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
    return uploaded.secure_url;
  }

  async function uploadFiles(files: FileList | null) {
    if (!canEdit) return;
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        uploadedUrls.push(await uploadOneImage(file));
      }
      setDraft((current) => ({
        ...current,
        imagesText: uploadedUrls.join("\n"),
      }));
      showResult("success", `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded. Previous images replaced. Click Save changes to update.`);
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* ────────────────────────── Field helper ────────────────────────── */
  function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-extrabold capitalize text-slate-900">{value || "—"}</p>
      </div>
    );
  }

  function EditableField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">{label}</p>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all"
        />
      </div>
    );
  }

  /* ─────────────────────── Tab Content Renderers ─────────────────────── */

  function renderProductInfo() {
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <Info className="h-4 w-4" /> Product Information
        </h3>
        {editing ? (
          <div className="space-y-4">
            <EditableField label="Product Name" value={draft.name} onChange={(v) => setDraft((c) => ({ ...c, name: v }))} placeholder="Outfit name" />
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Description</p>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                placeholder="Tell us about the design, context, or significance of this outfit..."
                className="w-full min-h-28 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ReadOnlyField label="Product Name" value={cleanProductName} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</p>
              <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{product.description || "No product description has been added yet."}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Tribe" value={product.region} />
              <ReadOnlyField label="Region" value={product.subcategory || "—"} />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPricing() {
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <DollarSign className="h-4 w-4" /> Pricing & Cost
        </h3>
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField label="USD Price" value={draft.priceUsd} onChange={(v) => setDraft((c) => ({ ...c, priceUsd: v }))} type="number" placeholder="0.00" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ETB Equivalent</p>
              <p className="text-2xl font-extrabold text-slate-900">{formatEtb(draft.priceUsd || 0)}</p>
            </div>
            <EditableField label="Groom / Men Price (USD)" value={draft.groomPriceUsd} onChange={(v) => setDraft((c) => ({ ...c, groomPriceUsd: v }))} type="number" placeholder="Optional" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">USD Price</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-800">{formatCurrency(product.priceUsd)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">ETB Price</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatEtb(product.priceUsd)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Men / Groom</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{product.groomPriceUsd ? formatCurrency(product.groomPriceUsd) : "—"}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGarmentSpecs() {
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <Shirt className="h-4 w-4" /> Garment Specifications
        </h3>
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Gender</p>
              <select
                value={draft.gender}
                onChange={(e) => setDraft((c) => ({ ...c, gender: e.target.value as Product["gender"] }))}
                className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <EditableField label="Fabric Texture" value={draft.fabricType} onChange={(v) => setDraft((c) => ({ ...c, fabricType: v }))} placeholder="e.g. Pure Cotton" />
            <EditableField label="Embroidery Style" value={draft.embroideryStyle} onChange={(v) => setDraft((c) => ({ ...c, embroideryStyle: v }))} placeholder="e.g. Traditional Tilet" />
            <EditableField label="Estimated Delivery Days" value={draft.tailoringDays} onChange={(v) => setDraft((c) => ({ ...c, tailoringDays: v }))} type="number" placeholder="30" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ReadOnlyField label="Product ID" value={displayUniqueId} />
            <ReadOnlyField label="Gender" value={product.gender} />
            <ReadOnlyField label="Fabric Texture" value={product.fabricType || "—"} />
            <ReadOnlyField label="Embroidery Style" value={product.embroideryStyle || "—"} />
            <ReadOnlyField label="Estimated Delivery Days" value={`${product.tailoringDays ?? 30} days`} />
          </div>
        )}
      </div>
    );
  }

  function renderStorefrontControls() {
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <ShieldCheck className="h-4 w-4" /> Storefront Controls
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Featured Toggle */}
          <div className="flex items-center justify-between p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900 leading-none flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-500" /> Featured Product
              </p>
              <p className="text-[10px] font-bold text-slate-400">Home page hero boost</p>
            </div>
            {canEdit ? (
              <button
                onClick={() => void toggleFeatured()}
                disabled={Boolean(busy)}
                className={cn(
                  "relative inline-flex h-7 w-12 rounded-full p-1 transition-all duration-300",
                  product.isFeatured ? "bg-amber-500 shadow-amber-200 shadow-md" : "bg-slate-200",
                  busy && "opacity-50"
                )}
              >
                <span className={cn("h-5 w-5 rounded-full bg-white shadow transition-all duration-300", product.isFeatured ? "translate-x-5" : "translate-x-0")} />
              </button>
            ) : null}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900 leading-none flex items-center gap-2">
                {product.isActive ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />} Publicly Active
              </p>
              <p className="text-[10px] font-bold text-slate-400">Visible for customers</p>
            </div>
            {canEdit ? (
              <button
                onClick={() => void toggleActive()}
                disabled={Boolean(busy)}
                className={cn(
                  "relative inline-flex h-7 w-12 rounded-full p-1 transition-all duration-300",
                  product.isActive ? "bg-emerald-500 shadow-emerald-200 shadow-md" : "bg-slate-200",
                  busy && "opacity-50"
                )}
              >
                <span className={cn("h-5 w-5 rounded-full bg-white shadow transition-all duration-300", product.isActive ? "translate-x-5" : "translate-x-0")} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Current status display */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Visibility Status" value={product.isActive ? "Active (Visible)" : "Hidden"} />
          <ReadOnlyField label="Home Page Highlight" value={product.isFeatured ? "Featured" : "Normal"} />
        </div>
      </div>
    );
  }

  function renderImagesManager() {
    const displayImages = editing ? parseImages(draft.imagesText) : images;
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <ImageIcon className="h-4 w-4" /> Images Manager
        </h3>

        {/* Gallery */}
        <div className="grid grid-cols-4 gap-3">
          {displayImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => image && setSelectedImage(image)}
              className={cn(
                "overflow-hidden rounded-xl border-2 bg-slate-100 aspect-square transition-all hover:scale-[1.03]",
                image && image === activeImage ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg" : "border-slate-200"
              )}
            >
              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
            </button>
          ))}
          {displayImages.length === 0 && (
            <div className="col-span-4 py-10 text-center text-xs font-bold uppercase text-slate-400 tracking-widest">No images available</div>
          )}
        </div>

        {/* Active image large preview */}
        {activeImage && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            <img src={activeImage} alt="" className="aspect-[4/5] w-full object-cover" />
          </div>
        )}

        {/* Upload section (edit mode) */}
        {editing && (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/20 p-5 space-y-4 animate-in fade-in duration-300">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-800">
              Upload replacement or additional images
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || Boolean(busy)}
              onChange={(event) => void uploadFiles(event.target.files)}
              className="block w-full text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-emerald-900 hover:file:bg-emerald-100 file:cursor-pointer"
            />
            {uploading && <span className="block text-xs font-semibold text-emerald-700 animate-pulse">Uploading images...</span>}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Image URLs (one per line)</label>
              <textarea
                value={draft.imagesText}
                onChange={(event) => setDraft((current) => ({ ...current, imagesText: event.target.value }))}
                placeholder="Paste Cloudinary or other image links here"
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold font-mono outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabRenderers: Record<TabKey, () => React.ReactNode> = {
    info: renderProductInfo,
    pricing: renderPricing,
    garment: renderGarmentSpecs,
    storefront: renderStorefrontControls,
    images: renderImagesManager,
  };

  return (
    <div ref={swalTargetRef} className="space-y-6">
      {/* ═══════════════════════════ HEADER BANNER ═══════════════════════════ */}
      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 shadow-xl relative overflow-hidden border-l-4 border-l-emerald-600">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
              <Package className="h-10 w-10" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">
                Product
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase truncate">
                {displayUniqueId}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Manage product details, pricing, inventory, and storefront visibility.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden lg:block text-right mr-2 max-w-xs xl:max-w-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Full Name</p>
              <p className="text-sm font-bold text-slate-600 truncate" title={cleanProductName}>
                {cleanProductName}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden lg:block"></div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  router.refresh();
                  showResult("success", "Product details reloaded.");
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-95 group"
              >
                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                Refresh
              </button>
              <button
                onClick={() => router.push("/admin/inventory")}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-95 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to products
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PROFILE IDENTITY CARD ═══════════════════════ */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Primary Image */}
          <div className="shrink-0">
            <div className="h-[180px] w-[180px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
              {activeImage ? (
                <img src={activeImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400 uppercase">No image</div>
              )}
            </div>
          </div>

          {/* Center: Info + Badges */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate" title={cleanProductName}>{cleanProductName}</h2>
              <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                Product ID: {displayUniqueId}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                product.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              )}>
                {product.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {product.isActive ? "Active" : "Hidden"}
              </span>
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 border border-amber-200">
                  <Star className="h-3 w-3" /> Featured
                </span>
              )}
              {product.subcategory && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">{product.subcategory}</span>
              )}
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">{product.region}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
              <span className="capitalize">Gender: {product.gender}</span>
              <span className="text-slate-300">|</span>
              <span>Delivery Window: {product.tailoringDays ?? 30} days</span>
            </div>
          </div>

          {/* Right: Vertical Button Stack */}
          {(canEdit || canDelete) && (
          <div className="flex flex-col gap-2 shrink-0 lg:w-44">
            {editing ? (
              <>
                <button
                  type="button"
                  disabled={Boolean(busy) || uploading}
                  onClick={() => void saveEdit()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95 disabled:opacity-50 w-full"
                >
                  <Save className="h-4 w-4" />
                  {busy === "patch" ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => void cancelEditMode()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all w-full"
                >
                  <X className="h-4 w-4" />
                  Cancel edit
                </button>
              </>
            ) : (
              <>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all active:scale-95 w-full"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Product
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void toggleActive()}
                      className={cn(
                        "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold shadow-sm transition-all active:scale-95 w-full disabled:opacity-50",
                        product.isActive
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      )}
                    >
                      <Power className="h-4 w-4" />
                      {product.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void deleteProduct()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white shadow-md hover:bg-rose-700 transition-all active:scale-95 w-full disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Product
                  </button>
                ) : null}
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ TABBED DETAIL SECTION ═══════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Left: Tab Navigation */}
        <nav className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all",
                activeTab === tab.key
                  ? "bg-emerald-800 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Active Tab Content */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm min-h-[400px]">
          {tabRenderers[activeTab]()}
        </div>
      </div>
    </div>
  );
}
