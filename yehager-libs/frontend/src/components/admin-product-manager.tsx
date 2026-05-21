"use client";

import { useMemo, useState } from "react";
import { Banknote, Clock, DollarSign, Eye, Hash, ImageIcon, MapPin, Pencil, Power, Save, Shirt, Star, Trash2, Upload, X } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { TAXONOMY, REGIONS } from "@/lib/taxonomy";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  region: string;
  subcategory?: string | null;
  category?: string | null;
  uniqueId?: string | null;
  priceUsd: string | number;
  groomPriceUsd?: string | number | null;
  familyRoles?: Array<{ label: string; icon?: string; price: number; gender: "male" | "female" | "unisex" }> | null;
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

type BulkImportItem = {
  folderName: string;
  files: File[];
  previewUrls: string[];
  name: string;
  uniqueId: string;
  description: string;
  priceUsd: string;
  groomPriceUsd: string;
  fabricType: string;
  embroideryStyle: string;
  tailoringDays: string;
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

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function buildFamilyRoles(priceUsd: string | number, groomPriceUsd?: string | number | null) {
  const womenPrice = Number(priceUsd);
  if (!Number.isFinite(womenPrice) || womenPrice <= 0) return undefined;
  const menPrice = Number(groomPriceUsd);
  return [
    { label: "Women", icon: "👩", price: womenPrice, gender: "female" as const },
    { label: "Men", icon: "👨", price: Number.isFinite(menPrice) && menPrice > 0 ? menPrice : Math.max(1, Math.round(womenPrice * 0.57)), gender: "male" as const },
    { label: "Kids", icon: "👧", price: Math.max(1, Math.round(womenPrice * 0.43)), gender: "unisex" as const },
  ];
}

function codePart(value: string | null | undefined, length: number) {
  const cleaned = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, length) || "GEN";
}

function buildProductIdentity(region: string, subcategory: string | null | undefined, sequence: number) {
  const sectionCode = codePart(region, 3);
  const subsectionCode = subcategory ? codePart(subcategory, 3) : "";
  const uniqueId = `${sectionCode}${subsectionCode ? `-${subsectionCode}` : ""}-${String(sequence).padStart(3, "0")}`;
  const titleParts = [region, subcategory, "Traditional Family Outfit"].filter(Boolean);
  return {
    uniqueId,
    name: `${titleParts.join(" ")} — ${uniqueId}`,
  };
}

export function AdminProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkImportItem[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"single" | "bulk" | null>(null);
  const [subsectionFilter, setSubsectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [detailEditing, setDetailEditing] = useState(false);

  const sectionNames = REGIONS;
  const taxonomyState = TAXONOMY as Record<string, string[]>;
  const subsections = taxonomyState[draft.region] ?? [];
  const filterSubsections =
    regionFilter === "all" ? Array.from(new Set(REGIONS.flatMap((section) => TAXONOMY[section] ?? []))) : taxonomyState[regionFilter] ?? [];
  const previewImages = parseImages(draft.imagesText);

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !needle ||
        [product.name, product.region, product.subcategory, product.uniqueId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesRegion = regionFilter === "all" || product.region === regionFilter;
      const matchesSubsection = subsectionFilter === "all" || product.subcategory === subsectionFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.isActive) ||
        (statusFilter === "inactive" && !product.isActive) ||
        (statusFilter === "featured" && product.isFeatured);
      const price = Number(product.priceUsd);
      const matchesMin = !minPrice || price >= Number(minPrice);
      const matchesMax = !maxPrice || price <= Number(maxPrice);
      return matchesSearch && matchesRegion && matchesSubsection && matchesStatus && matchesMin && matchesMax;
    });
  }, [maxPrice, minPrice, products, regionFilter, search, statusFilter, subsectionFilter]);

  const activeCount = products.filter((product) => product.isActive).length;
  const inactiveCount = products.length - activeCount;
  const nextDraftIdentity = buildProductIdentity(draft.region, draft.subcategory, nextProductSequence(draft.region, draft.subcategory));

  function showAlert(type: "success" | "error", message: string) {
    void Swal.fire({
      icon: type,
      title: type === "success" ? "Success" : "Something went wrong",
      text: message,
      confirmButtonColor: type === "success" ? "#047857" : "#dc2626",
      background: "#ffffff",
      color: "#0f172a",
    });
  }

  function formatEtb(value: string | number | null | undefined) {
    const amount = Number(value) * 156.16;
    if (!Number.isFinite(amount)) return "0 ETB";
    return `${Math.round(amount).toLocaleString()} ETB`;
  }

  function openProductDetail(product: Product) {
    setSelectedProduct(product);
    setSelectedImage(product.images?.[0] ?? "");
    setDetailEditing(false);
  }

  function nextProductSequence(region: string, subcategory: string | null | undefined, offset = 0) {
    const prefix = buildProductIdentity(region, subcategory, 0).uniqueId.replace(/-000$/, "");
    const matcher = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d{3,})$`);
    const maxExisting = products.reduce((max, product) => {
      if (product.region !== region) return max;
      if ((product.subcategory ?? "") !== (subcategory ?? "")) return max;
      const code = product.uniqueId ?? product.name.match(/[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,}$/)?.[0] ?? "";
      const match = matcher.exec(code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return maxExisting + 1 + offset;
  }

  async function createProduct() {
    setBusy("create");
    setError(null);
    try {
      const identity = buildProductIdentity(draft.region, draft.subcategory, nextProductSequence(draft.region, draft.subcategory));
      const response = await fetch("/api/backend/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          name: identity.name,
          uniqueId: identity.uniqueId,
          priceUsd: Number(draft.priceUsd),
          groomPriceUsd: draft.groomPriceUsd ? Number(draft.groomPriceUsd) : null,
          familyRoles: buildFamilyRoles(draft.priceUsd, draft.groomPriceUsd),
          tailoringDays: Number(draft.tailoringDays),
          images: previewImages,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not create product");
      }
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => [payload.data!, ...current]);
        setDraft(emptyDraft);
        setPreviewOpen(false);
        setCreateOpen(false);
        setCreateMode(null);
        showAlert("success", "Product created successfully and added to the storefront.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create product";
      setError(message);
      showAlert("error", message);
    } finally {
      setBusy(null);
    }
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
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        uploadedUrls.push(await uploadOneImage(file));
      }

      setDraft((current) => ({
        ...current,
        imagesText: [...parseImages(current.imagesText), ...uploadedUrls].join("\n"),
      }));
      showAlert("success", `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      setError(message);
      showAlert("error", message);
    } finally {
      setUploading(false);
    }
  }

  function prepareFolderImport(files: FileList | null) {
    if (!files?.length) return;
    const groups = new Map<string, File[]>();
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split("/");
      const folderName = parts.length > 1 ? parts[parts.length - 2] : "Product";
      groups.set(folderName, [...(groups.get(folderName) ?? []), file]);
    }

    const nextItems = Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([folderName, files], index) => {
        const identity = buildProductIdentity(draft.region, draft.subcategory, nextProductSequence(draft.region, draft.subcategory, index));
        return {
          folderName,
          files: files.slice(0, 8),
          previewUrls: files.slice(0, 8).map((file) => URL.createObjectURL(file)),
          name: identity.name,
          uniqueId: identity.uniqueId,
          description: draft.description,
          priceUsd: "",
          groomPriceUsd: "",
          fabricType: draft.fabricType,
          embroideryStyle: draft.embroideryStyle,
          tailoringDays: draft.tailoringDays,
        };
      });

    setBulkItems(nextItems);
    setBulkOpen(nextItems.length > 0);
  }

  async function createBulkProducts() {
    if (bulkItems.length === 0) return;
    setBulkCreating(true);
    setError(null);
    try {
      const createdProducts: Product[] = [];
      for (const item of bulkItems) {
        if (!item.priceUsd) {
          throw new Error(`Please enter a price for ${item.name || item.folderName}`);
        }
        const imageUrls: string[] = [];
        for (const file of item.files) {
          imageUrls.push(await uploadOneImage(file));
        }
        const response = await fetch("/api/backend/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            name: item.name,
            uniqueId: item.uniqueId,
            description: item.description || draft.description,
            priceUsd: Number(item.priceUsd),
            groomPriceUsd: item.groomPriceUsd ? Number(item.groomPriceUsd) : null,
            familyRoles: buildFamilyRoles(item.priceUsd, item.groomPriceUsd),
            fabricType: item.fabricType,
            embroideryStyle: item.embroideryStyle,
            tailoringDays: Number(item.tailoringDays || draft.tailoringDays),
            images: imageUrls,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `Could not create ${item.name || item.folderName}`);
        }
        const payload = (await response.json()) as { data?: Product };
        if (payload.data) createdProducts.push(payload.data);
      }
      setProducts((current) => [...createdProducts, ...current]);
      setBulkItems([]);
      setBulkOpen(false);
      setCreateOpen(false);
      setCreateMode(null);
      showAlert("success", `${createdProducts.length} product${createdProducts.length === 1 ? "" : "s"} imported successfully from folder.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not import folder products";
      setError(message);
      showAlert("error", message);
    } finally {
      setBulkCreating(false);
    }
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
        setSelectedProduct((current) => (current?.id === product.id ? payload.data! : current));
        setSelectedImage((current) => (payload.data?.images?.includes(current) ? current : payload.data?.images?.[0] ?? ""));
        showAlert("success", "Product status updated successfully.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update product";
      setError(message);
      showAlert("error", message);
    } finally {
      setBusy(null);
    }
  }

  async function confirmAndUpdateProduct(product: Product, patch: Partial<Product>, actionLabel: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: `Do you want to ${actionLabel.toLowerCase()} this product?`,
      showCancelButton: true,
      confirmButtonText: actionLabel,
      cancelButtonText: "Cancel",
      confirmButtonColor: actionLabel.toLowerCase().includes("deactivate") ? "#334155" : "#047857",
      cancelButtonColor: "#64748b",
    });
    if (result.isConfirmed) {
      await updateProduct(product, patch);
    }
  }

  async function deleteProduct(product: Product) {
    setBusy(product.id);
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((item) => (item.id === product.id ? payload.data! : item)));
        setSelectedProduct((current) => (current?.id === product.id ? payload.data! : current));
        showAlert("success", "Product deleted successfully. It is now hidden from the home page.");
        setDeleteTarget(null);
        setSelectedProduct(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete product";
      setError(message);
      showAlert("error", message);
    } finally {
      setBusy(null);
    }
  }

  function beginEdit(product: Product) {
    setEditingProductId(product.id);
    setCreateOpen(true);
    setCreateMode("single");
    setSelectedProduct(null);
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

  function beginDetailEdit(product: Product) {
    setEditingProductId(product.id);
    setDetailEditing(true);
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
          familyRoles: buildFamilyRoles(draft.priceUsd, draft.groomPriceUsd),
          tailoringDays: Number(draft.tailoringDays),
          images: previewImages,
        }),
      });
      if (!response.ok) throw new Error("Could not update product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((product) => (product.id === editingProductId ? payload.data! : product)));
        setSelectedProduct((current) => (current?.id === editingProductId ? payload.data! : current));
        setSelectedImage((current) => (payload.data?.images?.includes(current) ? current : payload.data?.images?.[0] ?? ""));
        setEditingProductId(null);
        setDetailEditing(false);
        setDraft(emptyDraft);
        setPreviewOpen(false);
        setCreateOpen(false);
        setCreateMode(null);
        showAlert("success", "Product updated successfully.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update product";
      setError(message);
      showAlert("error", message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Product Catalog</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Listed Products</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {activeCount} active / {inactiveCount} inactive / {filteredProducts.length} showing
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingProductId(null);
              setDraft(emptyDraft);
              setCreateChoiceOpen(true);
              setCreateMode(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800"
          >
            <span className="text-lg">+</span> Create Product
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products..."
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
          />
          <select
            value={regionFilter}
            onChange={(event) => {
              setRegionFilter(event.target.value);
              setSubsectionFilter("all");
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
          >
            <option value="all">All sections</option>
            {sectionNames.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
          <select
            value={subsectionFilter}
            onChange={(event) => setSubsectionFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
          >
            <option value="all">All subsections</option>
            {filterSubsections.map((subsection) => (
              <option key={subsection}>{subsection}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured</option>
          </select>
          <input
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            type="number"
            min="0"
            placeholder="Min price"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
          />
          <input
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            type="number"
            min="0"
            placeholder="Max price"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Region</th>
                  <th className="px-6 py-4">USD Price</th>
                  <th className="px-6 py-4">ETB Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Featured</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredProducts.map((product) => {
                  const image = product.images?.[0];
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex min-w-[420px] items-center gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div>
                            <p className="line-clamp-1 text-base font-extrabold text-slate-950">{product.name}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{product.subcategory || "No subsection"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700">
                        #{product.uniqueId ?? product.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">{product.region}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex min-w-28 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-extrabold text-slate-950">{Number(product.priceUsd) || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex min-w-32 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-extrabold text-slate-950">{formatEtb(product.priceUsd).replace(" ETB", "")}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${product.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {product.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${product.isFeatured ? "bg-amber-500 text-black" : "bg-white text-slate-900"}`}>
                          {product.isFeatured ? "Featured" : "Normal"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openProductDetail(product)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                      No products match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {createChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Create Product</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Choose how to add products</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Use single entry for one item, or folder import when each subfolder is one outfit design.</p>
              </div>
              <button type="button" onClick={() => setCreateChoiceOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setCreateChoiceOpen(false);
                  setCreateMode("single");
                  setCreateOpen(true);
                }}
                className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-400 hover:bg-emerald-100"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-2xl text-white">+</span>
                <span className="mt-4 block text-xl font-extrabold text-slate-950">Single Product</span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-600">Upload one outfit with up to four poses, pricing, and garment details.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateChoiceOpen(false);
                  setCreateMode("bulk");
                  setCreateOpen(true);
                }}
                className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-400 hover:bg-amber-100"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-black">↥</span>
                <span className="mt-4 block text-xl font-extrabold text-slate-950">Folder Import</span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-600">Select one parent folder. Each child folder becomes one product with auto title and ID.</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{editingProductId ? "Edit Product" : "Create Product"}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{editingProductId ? "Update catalog item" : "Add new product"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setEditingProductId(null);
                  setCreateMode(null);
                  setDraft(emptyDraft);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            </div>
            {createMode === "bulk" ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-semibold">Folder workflow:</span> choose section/subsection and garment defaults, then upload a parent folder. Each child folder becomes one product.
              </div>
            ) : null}
            <div className="mt-5 space-y-4">
              {!editingProductId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Auto Product Title</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-950">{nextDraftIdentity.name}</p>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-500">Next ID: {nextDraftIdentity.uniqueId}</p>
                </div>
              ) : (
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Product name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              )}
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder={createMode === "bulk" ? "Default description for imported products" : "Optional product details / description"} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value, subcategory: taxonomyState[event.target.value]?.[0] ?? "" }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                  {sectionNames.map((region) => <option key={region}>{region}</option>)}
                </select>
                <select value={draft.subcategory} onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                  <option value="">No subsection</option>
                  {subsections.map((subsection) => <option key={subsection}>{subsection}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Garment Details</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select value={draft.gender} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value as Product["gender"] }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                    <option value="female">Female</option><option value="male">Male</option><option value="unisex">Unisex</option>
                  </select>
                  <input value={draft.fabricType} onChange={(event) => setDraft((current) => ({ ...current, fabricType: event.target.value }))} placeholder="Fabric type" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                  <input value={draft.embroideryStyle} onChange={(event) => setDraft((current) => ({ ...current, embroideryStyle: event.target.value }))} placeholder="Embroidery / design style" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                  <input value={draft.tailoringDays} onChange={(event) => setDraft((current) => ({ ...current, tailoringDays: event.target.value }))} placeholder="Tailoring days" type="number" min="1" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Display Defaults</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">Handcrafted in Ethiopia / Traditional Cut</p>
                  </div>
                </div>
              </div>
              {createMode !== "bulk" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={draft.priceUsd} onChange={(event) => setDraft((current) => ({ ...current, priceUsd: event.target.value }))} placeholder="Women / main price USD" type="number" min="0" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                    <input value={draft.groomPriceUsd} onChange={(event) => setDraft((current) => ({ ...current, groomPriceUsd: event.target.value }))} placeholder="Men / groom price USD" type="number" min="0" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                  </div>
                  <textarea value={draft.imagesText} onChange={(event) => setDraft((current) => ({ ...current, imagesText: event.target.value }))} placeholder="Paste image URLs, one per line. Use 4 lines for 4 product poses." className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900" />
                  <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                    <span className="block font-bold text-slate-900">Upload product images</span>
                    <input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => void uploadFiles(event.target.files)} className="mt-3 block w-full text-sm" />
                    {uploading ? <span className="mt-2 block font-semibold text-emerald-700">Uploading images...</span> : null}
                  </label>
                  {previewImages.length > 0 ? <div className="grid gap-3 sm:grid-cols-4">{previewImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" className="aspect-[4/5] rounded-2xl object-cover" />)}</div> : null}
                </>
              ) : (
                <label className="block rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm">
                  <span className="block font-bold text-slate-900">Upload parent folder</span>
                  <span className="mt-1 block text-slate-600">Current target: <strong>{draft.region}</strong>{draft.subcategory ? <> / <strong>{draft.subcategory}</strong></> : null}</span>
                  <input type="file" accept="image/*" multiple onChange={(event) => prepareFolderImport(event.target.files)} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} className="mt-3 block w-full text-sm" />
                </label>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-800">
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.checked }))} /> Featured</label>
              </div>
              {createMode !== "bulk" ? (
                <button type="button" onClick={() => setPreviewOpen(true)} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white">
                  {editingProductId ? "Preview changes" : "Preview product"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">{editingProductId ? draft.name || "Untitled product" : nextDraftIdentity.name}</h2>
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
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  {[
                    ["Origin", "Handcrafted in Ethiopia"],
                    ["Fit type", "Traditional Cut"],
                    ["Fabric", draft.fabricType || "-"],
                    ["Design", draft.embroideryStyle || "-"],
                    ["Tailoring", `${draft.tailoringDays || 30} days`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-secondary p-3">
                      <p className="text-muted-foreground">{label}</p>
                      <p className="mt-1 font-semibold">{value}</p>
                    </div>
                  ))}
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

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Folder Import</p>
                <h2 className="mt-2 text-2xl font-semibold">Set prices for imported products</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review each folder, confirm the product name, and enter a price before creating products.
                </p>
              </div>
              <button type="button" onClick={() => setBulkOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {bulkItems.map((item, index) => (
                <section key={item.folderName} className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="grid grid-cols-2 gap-2">
                      {item.previewUrls.slice(0, 4).map((url) => (
                        <img key={url} src={url} alt="" className="aspect-[3/4] rounded-xl object-cover" />
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Folder</p>
                        <p className="mt-1 font-semibold">{item.folderName}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block text-sm md:col-span-1">
                          <span className="mb-1 block font-medium">Auto product title</span>
                          <input
                            value={item.name}
                            readOnly
                            className="h-11 w-full rounded-xl border border-input bg-muted px-3 font-semibold"
                          />
                          <span className="mt-1 block font-mono text-xs text-muted-foreground">{item.uniqueId}</span>
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Women / main price USD *</span>
                          <input
                            value={item.priceUsd}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, priceUsd: event.target.value } : entry))
                            }
                            type="number"
                            min="0"
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Men / groom price USD</span>
                          <input
                            value={item.groomPriceUsd}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, groomPriceUsd: event.target.value } : entry))
                            }
                            type="number"
                            min="0"
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Fabric type</span>
                          <input
                            value={item.fabricType}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, fabricType: event.target.value } : entry))
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Embroidery / design style</span>
                          <input
                            value={item.embroideryStyle}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, embroideryStyle: event.target.value } : entry))
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Tailoring days</span>
                          <input
                            value={item.tailoringDays}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, tailoringDays: event.target.value } : entry))
                            }
                            type="number"
                            min="1"
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Description</span>
                          <input
                            value={item.description}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: event.target.value } : entry))
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.files.length} image pose(s) will be attached to this product.</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setBulkOpen(false)} className="rounded-xl border border-border px-5 py-3 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkCreating}
                onClick={() => void createBulkProducts()}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {bulkCreating ? "Creating products..." : "Create imported products"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedProduct.region}
                  </span>
                  {selectedProduct.subcategory ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{selectedProduct.subcategory}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-bold text-white">
                    <Hash className="h-3.5 w-3.5" />
                    {selectedProduct.uniqueId ?? selectedProduct.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-3 max-w-4xl text-2xl font-extrabold leading-tight text-slate-950">{selectedProduct.name}</h2>
              </div>
              <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  disabled={busy === selectedProduct.id}
                  onClick={() =>
                    void confirmAndUpdateProduct(
                      selectedProduct,
                      { isActive: !selectedProduct.isActive },
                      selectedProduct.isActive ? "Deactivate" : "Activate",
                    )
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold text-white ${
                    selectedProduct.isActive ? "bg-slate-800 hover:bg-slate-700" : "bg-emerald-700 hover:bg-emerald-800"
                  } disabled:opacity-60`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {selectedProduct.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy === selectedProduct.id}
                  onClick={() =>
                    void confirmAndUpdateProduct(
                      selectedProduct,
                      { isFeatured: !selectedProduct.isFeatured },
                      selectedProduct.isFeatured ? "Unfeature" : "Feature",
                    )
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  <Star className="h-3.5 w-3.5" />
                  {selectedProduct.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  type="button"
                  onClick={() => beginDetailEdit(selectedProduct)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedProduct)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailEditing(false);
                    setSelectedProduct(null);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                  aria-label="Close product detail"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
            </div>

            {detailEditing ? (
              <div className="border-b border-slate-200 bg-emerald-50/70 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Edit Product</p>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-950">Update this product without leaving detail view</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailEditing(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
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
                <label className="mt-4 block rounded-2xl border border-dashed border-emerald-300 bg-white p-4 text-sm">
                  <span className="flex items-center gap-2 font-bold text-slate-900"><Upload className="h-4 w-4" /> Upload product images</span>
                  <input type="file" accept="image/*" multiple disabled={uploading || busy === "edit"} onChange={(event) => void uploadFiles(event.target.files)} className="mt-3 block w-full text-sm" />
                  {uploading ? <span className="mt-2 block font-semibold text-emerald-700">Uploading images...</span> : null}
                </label>
                <button
                  type="button"
                  disabled={busy === "edit" || uploading}
                  onClick={() => void saveEditedProduct()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {busy === "edit" ? "Saving..." : "Save changes"}
                </button>
              </div>
            ) : null}

            <div className="grid gap-6 p-5 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {selectedImage || selectedProduct.images?.[0] ? (
                    <img src={selectedImage || selectedProduct.images?.[0]} alt="" className="aspect-[4/5] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                      <ImageIcon className="h-8 w-8" />
                      No image
                    </div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(selectedProduct.images?.length ? selectedProduct.images : [""]).slice(0, 4).map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => image && setSelectedImage(image)}
                      className={`overflow-hidden rounded-xl border bg-slate-100 ${
                        image && image === (selectedImage || selectedProduct.images?.[0]) ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
                      }`}
                    >
                      {image ? <img src={image} alt="" className="aspect-square w-full object-cover" /> : <span className="flex aspect-square items-center justify-center text-xs text-slate-400">Empty</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
                      <DollarSign className="h-4 w-4" />
                      USD Price
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-800">{formatCurrency(selectedProduct.priceUsd)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Banknote className="h-4 w-4" />
                      ETB Price
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatEtb(selectedProduct.priceUsd)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Shirt className="h-4 w-4" />
                      Men / Groom
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950">{selectedProduct.groomPriceUsd ? formatCurrency(selectedProduct.groomPriceUsd) : "-"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedProduct.description || "No product description has been added yet."}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Garment Details</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      ["Section", selectedProduct.region, MapPin],
                      ["Subsection", selectedProduct.subcategory || "-", Hash],
                      ["Gender", selectedProduct.gender, Shirt],
                      ["Origin", "Handcrafted in Ethiopia", MapPin],
                      ["Fit type", "Traditional Cut", Shirt],
                      ["Fabric", selectedProduct.fabricType || "-", Shirt],
                      ["Embroidery", selectedProduct.embroideryStyle || "-", Star],
                      ["Tailoring days", `${selectedProduct.tailoringDays ?? 30} days`, Clock],
                      ["Visibility", selectedProduct.isActive ? "Active" : "Hidden", Power],
                      ["Home highlight", selectedProduct.isFeatured ? "Featured" : "Normal", Star],
                    ].map(([label, value, Icon]) => {
                      const DetailIcon = Icon as typeof MapPin;
                      return (
                        <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                            <DetailIcon className="h-4 w-4" />
                            {String(label)}
                          </p>
                          <p className="mt-1 text-sm font-extrabold capitalize text-slate-950">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">!</div>
            <h2 className="mt-4 text-center text-xl font-extrabold text-slate-950">Delete product?</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">{deleteTarget.name}</span> will be hidden from the public home page.
              You can still restore visibility later by editing the product status.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busy === deleteTarget.id}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                No, keep it
              </button>
              <button
                type="button"
                disabled={busy === deleteTarget.id}
                onClick={() => void deleteProduct(deleteTarget)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {busy === deleteTarget.id ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
