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

type BulkImportItem = {
  folderName: string;
  files: File[];
  previewUrls: string[];
  name: string;
  priceUsd: string;
  groomPriceUsd: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type CatalogSection = {
  name: string;
  subsections: string[];
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
  const [catalogSections, setCatalogSections] = useState<CatalogSection[]>(
    REGIONS.map((region) => ({ name: region, subsections: TAXONOMY[region] ?? [] })),
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkImportItem[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [subsectionFilter, setSubsectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sectionModal, setSectionModal] = useState<"add" | "edit" | null>(null);
  const [sectionDraft, setSectionDraft] = useState({ originalName: "", name: "", subsectionsText: "" });

  const sectionNames = catalogSections.map((section) => section.name);
  const taxonomyState = Object.fromEntries(catalogSections.map((section) => [section.name, section.subsections])) as Record<string, string[]>;
  const subsections = taxonomyState[draft.region] ?? [];
  const filterSubsections =
    regionFilter === "all" ? Array.from(new Set(catalogSections.flatMap((section) => section.subsections))) : taxonomyState[regionFilter] ?? [];
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

  const sectionSummaries = catalogSections.map((section) => {
    const sectionProducts = products.filter((product) => product.region === section.name);
    return {
      ...section,
      count: sectionProducts.length,
      active: sectionProducts.filter((product) => product.isActive).length,
      featured: sectionProducts.filter((product) => product.isFeatured).length,
    };
  });

  function formatEtb(value: string | number | null | undefined) {
    const amount = Number(value) * 156.16;
    if (!Number.isFinite(amount)) return "0 ETB";
    return `${Math.round(amount).toLocaleString()} ETB`;
  }

  function openAddSection() {
    setSectionDraft({ originalName: "", name: "", subsectionsText: "" });
    setSectionModal("add");
  }

  function openEditSection(section: CatalogSection) {
    setSectionDraft({
      originalName: section.name,
      name: section.name,
      subsectionsText: section.subsections.join(", "),
    });
    setSectionModal("edit");
  }

  function saveSection() {
    const name = sectionDraft.name.trim();
    const subsections = sectionDraft.subsectionsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name) {
      setNotice({ type: "error", message: "Please enter a section name." });
      return;
    }

    const duplicate = catalogSections.some(
      (section) => section.name.toLowerCase() === name.toLowerCase() && section.name !== sectionDraft.originalName,
    );
    if (duplicate) {
      setNotice({ type: "error", message: "A section with this name already exists." });
      return;
    }

    if (sectionModal === "edit") {
      setCatalogSections((current) =>
        current.map((section) => (section.name === sectionDraft.originalName ? { name, subsections } : section)),
      );
      setProducts((current) =>
        current.map((product) => (product.region === sectionDraft.originalName ? { ...product, region: name } : product)),
      );
      setRegionFilter((current) => (current === sectionDraft.originalName ? name : current));
      setDraft((current) => ({
        ...current,
        region: current.region === sectionDraft.originalName ? name : current.region,
        subcategory: subsections.includes(current.subcategory) ? current.subcategory : subsections[0] ?? "",
      }));
      setNotice({ type: "success", message: "Catalog section updated successfully." });
    } else {
      setCatalogSections((current) => [...current, { name, subsections }]);
      setNotice({ type: "success", message: "Catalog section added successfully." });
    }

    setSectionModal(null);
  }

  function deleteSection(section: CatalogSection) {
    const productCount = products.filter((product) => product.region === section.name).length;
    if (productCount > 0) {
      setNotice({ type: "error", message: `Move or delete ${productCount} product(s) before deleting ${section.name}.` });
      return;
    }
    setCatalogSections((current) => current.filter((item) => item.name !== section.name));
    setRegionFilter((current) => (current === section.name ? "all" : current));
    setNotice({ type: "success", message: "Catalog section deleted successfully." });
  }

  async function createProduct() {
    setBusy("create");
    setError(null);
    setNotice(null);
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
        setCreateOpen(false);
        setNotice({ type: "success", message: "Product created successfully and added to the storefront." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create product";
      setError(message);
      setNotice({ type: "error", message });
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
      setNotice({ type: "success", message: `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded successfully.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      setError(message);
      setNotice({ type: "error", message });
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

    const nextItems = Array.from(groups.entries()).map(([folderName, files]) => ({
      folderName,
      files: files.slice(0, 8),
      previewUrls: files.slice(0, 8).map((file) => URL.createObjectURL(file)),
      name: folderName.replace(/[-_]+/g, " "),
      priceUsd: "",
      groomPriceUsd: "",
    }));

    setBulkItems(nextItems);
    setBulkOpen(nextItems.length > 0);
  }

  async function createBulkProducts() {
    if (bulkItems.length === 0) return;
    setBulkCreating(true);
    setError(null);
    setNotice(null);
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
            name: item.name || item.folderName,
            priceUsd: Number(item.priceUsd),
            groomPriceUsd: item.groomPriceUsd ? Number(item.groomPriceUsd) : null,
            tailoringDays: Number(draft.tailoringDays),
            images: imageUrls,
          }),
        });
        if (!response.ok) throw new Error(`Could not create ${item.name || item.folderName}`);
        const payload = (await response.json()) as { data?: Product };
        if (payload.data) createdProducts.push(payload.data);
      }
      setProducts((current) => [...createdProducts, ...current]);
      setBulkItems([]);
      setBulkOpen(false);
      setCreateOpen(false);
      setNotice({
        type: "success",
        message: `${createdProducts.length} product${createdProducts.length === 1 ? "" : "s"} imported successfully from folder.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not import folder products";
      setError(message);
      setNotice({ type: "error", message });
    } finally {
      setBulkCreating(false);
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
    setNotice(null);
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
        setNotice({ type: "success", message: "Product status updated successfully." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update product";
      setError(message);
      setNotice({ type: "error", message });
    } finally {
      setBusy(null);
    }
  }

  async function deleteProduct(product: Product) {
    setBusy(product.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete product");
      const payload = (await response.json()) as { data?: Product };
      if (payload.data) {
        setProducts((current) => current.map((item) => (item.id === product.id ? payload.data! : item)));
        setSelectedProduct((current) => (current?.id === product.id ? payload.data! : current));
        setNotice({ type: "success", message: "Product deleted successfully. It is now hidden from the home page." });
        setDeleteTarget(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete product";
      setError(message);
      setNotice({ type: "error", message });
    } finally {
      setBusy(null);
    }
  }

  function beginEdit(product: Product) {
    setEditingProductId(product.id);
    setCreateOpen(true);
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

  async function saveEditedProduct() {
    if (!editingProductId) return;
    const existing = products.find((product) => product.id === editingProductId);
    if (!existing) return;

    setBusy("edit");
    setError(null);
    setNotice(null);
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
        setCreateOpen(false);
        setSelectedProduct(payload.data);
        setNotice({ type: "success", message: "Product updated successfully." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update product";
      setError(message);
      setNotice({ type: "error", message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold shadow-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Catalog Sections</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Manage product sections</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Add, edit, delete, or open products inside each section.</p>
          </div>
          <button
            type="button"
            onClick={openAddSection}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800"
          >
            <span className="text-lg">+</span> Add Section
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectionSummaries.map((section) => (
            <article
              key={section.name}
              className={`rounded-3xl border p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 ${
                regionFilter === section.name ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">{section.name}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{section.subsections.length} subsection(s)</p>
                </div>
                <span className="rounded-2xl bg-slate-900 px-3 py-1 text-xs font-extrabold text-white">{section.count}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
                <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">{section.active} active</span>
                <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">{section.featured} featured</span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs font-medium text-slate-500">
                {section.subsections.length ? section.subsections.join(", ") : "No subsections"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegionFilter(section.name);
                    setSubsectionFilter("all");
                  }}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                >
                  View inside
                </button>
                <button
                  type="button"
                  onClick={() => openEditSection(section)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(section)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

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
              setCreateOpen(true);
              setSelectedProduct(null);
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

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Section</th>
                  <th className="px-5 py-4">Subsection</th>
                  <th className="px-5 py-4">USD Price</th>
                  <th className="px-5 py-4">ETB Price</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Featured</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="cursor-pointer bg-black text-white transition hover:bg-sky-950/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-14 overflow-hidden rounded-xl bg-slate-800">
                          {product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="max-w-[360px]">
                          <p className="font-extrabold leading-5 text-white">{product.name}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-400">{product.category || product.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">#{product.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">{product.region}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{product.subcategory || "-"}</td>
                    <td className="px-5 py-4">
                      <input
                        value={String(product.priceUsd)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void updateProduct(product, { priceUsd: Number(event.target.value) })}
                        className="h-10 w-28 rounded-lg border border-white/10 bg-white/10 px-3 font-bold text-white"
                      />
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-100">{formatEtb(product.priceUsd)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void updateProduct(product, { isActive: !product.isActive });
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${product.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void updateProduct(product, { isFeatured: !product.isFeatured });
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${product.isFeatured ? "bg-amber-500 text-black" : "bg-white text-slate-800"}`}
                      >
                        {product.isFeatured ? "Featured" : "Normal"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            beginEdit(product);
                          }}
                          className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(product);
                          }}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
                  setDraft(emptyDraft);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Bulk workflow:</span> choose section/subsection, then upload a parent folder. Each child folder becomes one product with pose images.
            </div>
            <div className="mt-5 space-y-4">
              <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Product name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Product details / description" className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value, subcategory: taxonomyState[event.target.value]?.[0] ?? "" }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                  {sectionNames.map((region) => <option key={region}>{region}</option>)}
                </select>
                <select value={draft.subcategory} onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                  <option value="">No subsection</option>
                  {subsections.map((subsection) => <option key={subsection}>{subsection}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                <select value={draft.gender} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value }))} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900">
                  <option value="female">female</option><option value="male">male</option><option value="unisex">unisex</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={draft.priceUsd} onChange={(event) => setDraft((current) => ({ ...current, priceUsd: event.target.value }))} placeholder="Price USD" type="number" min="0" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
                <input value={draft.tailoringDays} onChange={(event) => setDraft((current) => ({ ...current, tailoringDays: event.target.value }))} placeholder="Tailoring days" type="number" min="1" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900" />
              </div>
              <textarea value={draft.imagesText} onChange={(event) => setDraft((current) => ({ ...current, imagesText: event.target.value }))} placeholder="Paste image URLs, one per line. Use 4 lines for 4 product poses." className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-900" />
              <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                <span className="block font-bold text-slate-900">Upload product images</span>
                <input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => void uploadFiles(event.target.files)} className="mt-3 block w-full text-sm" />
                {uploading ? <span className="mt-2 block font-semibold text-emerald-700">Uploading images...</span> : null}
              </label>
              <label className="block rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm">
                <span className="block font-bold text-slate-900">Bulk upload product folder by section</span>
                <span className="mt-1 block text-slate-600">Current target: <strong>{draft.region}</strong>{draft.subcategory ? <> / <strong>{draft.subcategory}</strong></> : null}</span>
                <input type="file" accept="image/*" multiple onChange={(event) => prepareFolderImport(event.target.files)} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} className="mt-3 block w-full text-sm" />
              </label>
              {previewImages.length > 0 ? <div className="grid gap-3 sm:grid-cols-4">{previewImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" className="aspect-[4/5] rounded-2xl object-cover" />)}</div> : null}
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-800">
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.checked }))} /> Featured</label>
              </div>
              <button type="button" onClick={() => setPreviewOpen(true)} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white">
                {editingProductId ? "Preview changes" : "Preview product"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="mb-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
                >
                  ← Back
                </button>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Product Detail</p>
                <h2 className="mt-1 max-w-3xl text-3xl font-extrabold leading-tight text-slate-950">{selectedProduct.name}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  #{selectedProduct.id.slice(0, 8).toUpperCase()} / {selectedProduct.region}
                  {selectedProduct.subcategory ? ` / ${selectedProduct.subcategory}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void updateProduct(selectedProduct, { isActive: !selectedProduct.isActive })}
                  className={`rounded-xl px-4 py-3 text-sm font-extrabold text-white ${selectedProduct.isActive ? "bg-slate-800" : "bg-emerald-700"}`}
                >
                  {selectedProduct.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => beginEdit(selectedProduct)}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedProduct)}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(selectedProduct.images?.length ? selectedProduct.images : [""]).slice(0, 4).map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                      {image ? (
                        <img src={image} alt="" className="aspect-[4/5] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/5] items-center justify-center text-sm font-semibold text-slate-500">No image</div>
                      )}
                      <div className="px-4 py-3 text-sm font-bold text-slate-700">{index === 0 ? "Primary pose" : `Pose ${index + 1}`}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">USD Price</p>
                    <p className="mt-2 text-3xl font-extrabold text-amber-700">{formatCurrency(selectedProduct.priceUsd)}</p>
                  </div>
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">ETB Price</p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-700">{formatEtb(selectedProduct.priceUsd)}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-extrabold text-slate-950">Description</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedProduct.description || "No product description has been added yet."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Section", selectedProduct.region],
                    ["Subsection", selectedProduct.subcategory || "-"],
                    ["Category", selectedProduct.category || "-"],
                    ["Gender", selectedProduct.gender],
                    ["Fabric", selectedProduct.fabricType || "-"],
                    ["Embroidery", selectedProduct.embroideryStyle || "-"],
                    ["Tailoring days", `${selectedProduct.tailoringDays ?? 30} days`],
                    ["Status", selectedProduct.isActive ? "Active" : "Inactive"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900">
                  Featured on home page
                  <input
                    type="checkbox"
                    checked={Boolean(selectedProduct.isFeatured)}
                    onChange={() => void updateProduct(selectedProduct, { isFeatured: !selectedProduct.isFeatured })}
                  />
                </label>
              </div>
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
                      {item.previewUrls.slice(0, 4).map((url, imageIndex) => (
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
                          <span className="mb-1 block font-medium">Product name</span>
                          <input
                            value={item.name}
                            onChange={(event) =>
                              setBulkItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: event.target.value } : entry))
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-3"
                          />
                        </label>
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
