"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Pencil, Power, Save, Star, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

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

export function AdminProductDetailPanel({ product: initialProduct }: { product: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initialProduct);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(initialProduct.images?.[0] ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(draftFromProduct(initialProduct));

  const images = product.images?.filter(Boolean) ?? [];
  const activeImage = images.includes(selectedImage) ? selectedImage : images[0] ?? "";

  async function confirmAction(title: string, text: string, confirmButtonText: string, icon: "warning" | "question" = "warning") {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: "Cancel",
      confirmButtonColor: confirmButtonText.toLowerCase().includes("delete") ? "#dc2626" : "#047857",
      cancelButtonColor: "#64748b",
    });
    return result.isConfirmed;
  }

  function showResult(type: "success" | "error", message: string) {
    void Swal.fire({
      icon: type,
      title: type === "success" ? "Success" : "Something went wrong",
      text: message,
      confirmButtonColor: type === "success" ? "#047857" : "#dc2626",
    });
  }

  async function patchProduct(patch: Partial<Product>, successMessage: string) {
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
    const nextActive = !product.isActive;
    const confirmed = await confirmAction(
      nextActive ? "Activate product?" : "Deactivate product?",
      nextActive ? "This product will become visible to customers." : "This product will be hidden from customers.",
      nextActive ? "Activate" : "Deactivate",
    );
    if (confirmed) await patchProduct({ isActive: nextActive }, nextActive ? "Product activated successfully." : "Product deactivated successfully.");
  }

  async function toggleFeatured() {
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
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Product deleted successfully.",
        confirmButtonColor: "#047857",
      });
      router.push("/admin/inventory");
      router.refresh();
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Product delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
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
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        uploadedUrls.push(await uploadOneImage(file));
      }
      setDraft((current) => ({
        ...current,
        imagesText: [...parseImages(current.imagesText), ...uploadedUrls].join("\n"),
      }));
      showResult("success", `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded. Click Save changes to update this product.`);
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/admin/inventory" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
              Back to products
            </Link>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">{product.region}</span>
              {product.subcategory ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{product.subcategory}</span> : null}
              <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-bold text-white">{product.uniqueId ?? product.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight text-slate-950">{product.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={() => void toggleActive()} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white ${product.isActive ? "bg-slate-800 hover:bg-slate-700" : "bg-emerald-700 hover:bg-emerald-800"} disabled:opacity-60`}>
              <Power className="h-4 w-4" />
              {product.isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void toggleFeatured()} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-800 hover:bg-amber-100 disabled:opacity-60">
              <Star className="h-4 w-4" />
              {product.isFeatured ? "Unfeature" : "Feature"}
            </button>
            <button type="button" onClick={() => setEditing((current) => !current)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editing ? "Cancel edit" : "Edit"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void deleteProduct()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {editing ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900 md:col-span-2" />
              <input value={draft.priceUsd} onChange={(event) => setDraft((current) => ({ ...current, priceUsd: event.target.value }))} type="number" min="0" placeholder="Women / main price USD" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <input value={draft.groomPriceUsd} onChange={(event) => setDraft((current) => ({ ...current, groomPriceUsd: event.target.value }))} type="number" min="0" placeholder="Men / groom price USD" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <select value={draft.gender} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value as Product["gender"] }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unisex">Unisex</option>
              </select>
              <input value={draft.tailoringDays} onChange={(event) => setDraft((current) => ({ ...current, tailoringDays: event.target.value }))} type="number" min="1" placeholder="Tailoring days" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <input value={draft.fabricType} onChange={(event) => setDraft((current) => ({ ...current, fabricType: event.target.value }))} placeholder="Fabric type" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <input value={draft.embroideryStyle} onChange={(event) => setDraft((current) => ({ ...current, embroideryStyle: event.target.value }))} placeholder="Embroidery / design style" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900 md:col-span-2" />
              <textarea value={draft.imagesText} onChange={(event) => setDraft((current) => ({ ...current, imagesText: event.target.value }))} placeholder="Image URLs, one per line" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900 md:col-span-2" />
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-white p-4">
              <span className="block text-sm font-bold text-slate-900">Upload replacement or additional product images</span>
              <input type="file" accept="image/*" multiple disabled={uploading || Boolean(busy)} onChange={(event) => void uploadFiles(event.target.files)} className="mt-3 block w-full text-sm" />
              {uploading ? <span className="mt-2 block text-sm font-semibold text-emerald-700">Uploading images...</span> : null}
              {parseImages(draft.imagesText).length > 0 ? (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {parseImages(draft.imagesText).slice(0, 12).map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt="" className="aspect-square rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" disabled={Boolean(busy) || uploading} onClick={() => void saveEdit()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {activeImage ? <img src={activeImage} alt="" className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center text-sm font-semibold text-slate-500">No image</div>}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(images.length ? images : [""]).slice(0, 4).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => image && setSelectedImage(image)}
                  className={`overflow-hidden rounded-xl border bg-slate-100 ${image && image === activeImage ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}
                >
                  {image ? <img src={image} alt="" className="aspect-square w-full object-cover" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">USD Price</p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-800">{formatCurrency(product.priceUsd)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">ETB Price</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatEtb(product.priceUsd)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Men / Groom</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-950">{product.groomPriceUsd ? formatCurrency(product.groomPriceUsd) : "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{product.description || "No product description has been added yet."}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Garment Details</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Section", product.region],
                  ["Subsection", product.subcategory || "-"],
                  ["Gender", product.gender],
                  ["Origin", "Handcrafted in Ethiopia"],
                  ["Fit type", "Traditional Cut"],
                  ["Fabric", product.fabricType || "-"],
                  ["Embroidery", product.embroideryStyle || "-"],
                  ["Tailoring days", `${product.tailoringDays ?? 30} days`],
                  ["Visibility", product.isActive ? "Active" : "Hidden"],
                  ["Home highlight", product.isFeatured ? "Featured" : "Normal"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-extrabold capitalize text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
