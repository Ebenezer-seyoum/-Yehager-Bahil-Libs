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
  Info,
  DollarSign,
  Shirt,
  ImageIcon,
  Eye,
  EyeOff,
  Send,
  BadgeDollarSign,
} from "lucide-react";
import {
  dashboardConfirm,
  dashboardError,
  dashboardSuccess,
} from "@/lib/dashboard-swal";
import { uploadFileToS3 } from "@/lib/uploads";
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
  profitCostSetting?: {
    designerCostUsd?: string | number | null;
    taxPercent?: string | number | null;
    otherCostUsd?: string | number | null;
  } | null;
  familyRoles?: Array<{
    label: string;
    icon?: string;
    price: string | number;
    gender: "male" | "female" | "unisex";
    customerType?: "woman" | "man" | "girl" | "boy";
    outfitOption?: "standard" | "full_set" | "top_only" | "pants_only";
    description?: string;
    designerCostUsd?: string | number | null;
    taxPercent?: string | number | null;
    otherCostUsd?: string | number | null;
    currency?: "USD" | "ETB";
    enteredPrice?: string | number | null;
    exchangeRate?: string | number | null;
    designerPriceEtb?: string | number | null;
    markupAmountEtb?: string | number | null;
    sellingPriceEtb?: string | number | null;
    pricingRuleKey?: string | null;
  }> | null;
  gender: "male" | "female" | "unisex";
  images?: string[];
  fabricType?: string | null;
  embroideryStyle?: string | null;
  tailoringDays?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sendToTelegram?: boolean;
  priceStatus?: string | null;
  telegramStatus?: string | null;
  telegramTopicId?: string | null;
  telegramMessageId?: string | null;
  priceSubmissionCount?: number | null;
  priceVersion?: number | null;
  lastPriceSubmittedAt?: string | null;
  lastPriceApprovedAt?: string | null;
  estimatedPrices?: {
    men: number;
    woman: number;
    boy: number;
    girl: number;
  } | null;
};

type ProductPatch = Partial<Product> & {
  designerCostUsd?: number;
  taxPercent?: number;
  otherCostUsd?: number;
};

type DraftRole = {
  label: string;
  icon?: string;
  price: string;
  gender: "male" | "female" | "unisex";
  customerType?: "woman" | "man" | "girl" | "boy";
  outfitOption?: "standard" | "full_set" | "top_only" | "pants_only";
  description?: string;
  designerCostUsd: string;
  taxPercent: string;
  otherCostUsd: string;
};

const DETAIL_ROLE_TEMPLATES: DraftRole[] = [
  { label: "Women's Traditional Outfit", gender: "female", customerType: "woman", outfitOption: "standard", description: "Traditional outfit for women", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Men's Traditional Full Set", gender: "male", customerType: "man", outfitOption: "full_set", description: "Traditional top and pants", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Men's Traditional Top", gender: "male", customerType: "man", outfitOption: "top_only", description: "Traditional top garment", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Men's Traditional Pants", gender: "male", customerType: "man", outfitOption: "pants_only", description: "Traditional pants", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Girls' Traditional Outfit", gender: "female", customerType: "girl", outfitOption: "standard", description: "Traditional outfit for girls", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Boys' Traditional Full Set", gender: "male", customerType: "boy", outfitOption: "full_set", description: "Traditional top and pants for boys", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Boys' Traditional Top", gender: "male", customerType: "boy", outfitOption: "top_only", description: "Traditional top garment for boys", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
  { label: "Boys' Traditional Pants", gender: "male", customerType: "boy", outfitOption: "pants_only", description: "Traditional pants for boys", price: "", designerCostUsd: "", taxPercent: "", otherCostUsd: "" },
];

function roleKey(role: { label?: string; customerType?: DraftRole["customerType"]; outfitOption?: DraftRole["outfitOption"] }) {
  if (role.customerType) return `${role.customerType}:${role.outfitOption ?? "standard"}`;
  const label = String(role.label ?? "").toLowerCase();
  const customerType = label.includes("boy") ? "boy" : label.includes("girl") ? "girl" : label.includes("men") || label.includes("groom") ? "man" : "woman";
  const outfitOption = label.includes("pants") ? "pants_only" : label.includes("top") || label.includes("tishri") ? "top_only" : label.includes("full") ? "full_set" : "standard";
  return `${customerType}:${outfitOption}`;
}

type TabKey = "info" | "pricing" | "estimated" | "garment" | "storefront" | "telegram" | "images";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "info",
    label: "Product Information",
    icon: <Info className="h-4 w-4" />,
  },
  {
    key: "pricing",
    label: "Pricing & Cost",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    key: "estimated",
    label: "Estimated Prices",
    icon: <BadgeDollarSign className="h-4 w-4" />,
  },
  {
    key: "garment",
    label: "Garment Specs",
    icon: <Shirt className="h-4 w-4" />,
  },
  {
    key: "storefront",
    label: "Storefront Controls",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    key: "telegram",
    label: "Telegram Pricing",
    icon: <Send className="h-4 w-4" />,
  },
  {
    key: "images",
    label: "Images Manager",
    icon: <ImageIcon className="h-4 w-4" />,
  },
];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatEtb(value: string | number | null | undefined) {
  const amount = Number(value) * 156.16;
  if (!Number.isFinite(amount)) return "0 ETB";
  return `${Math.round(amount).toLocaleString()} ETB`;
}

function formatPercent(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0%";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
}

function parseImages(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRequiredNumber(value: string, label: string) {
  if (value.trim() === "") throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`${label} must be a valid non-negative number.`);
  return parsed;
}

type EstimateKey = "men" | "woman" | "boy" | "girl";
type EstimateDraft = Record<EstimateKey, string>;

const ESTIMATE_FIELDS: Array<{ key: EstimateKey; label: string; customerType: "man" | "woman" | "boy" | "girl" }> = [
  { key: "men", label: "Men", customerType: "man" },
  { key: "woman", label: "Woman", customerType: "woman" },
  { key: "boy", label: "Boy", customerType: "boy" },
  { key: "girl", label: "Girl", customerType: "girl" },
];

function estimateDraftFromProduct(product: Product): EstimateDraft {
  const stored = product.estimatedPrices;
  const roleEstimate = (customerType: "man" | "woman" | "boy" | "girl") =>
    product.familyRoles?.find((role) => role.customerType === customerType && Number(role.designerPriceEtb) > 0)?.designerPriceEtb;
  return {
    men: String(stored?.men || roleEstimate("man") || ""),
    woman: String(stored?.woman || roleEstimate("woman") || ""),
    boy: String(stored?.boy || roleEstimate("boy") || ""),
    girl: String(stored?.girl || roleEstimate("girl") || ""),
  };
}

function roleProductionCost(role: {
  price?: string | number | null;
  designerCostUsd?: string | number | null;
  taxPercent?: string | number | null;
  otherCostUsd?: string | number | null;
}) {
  const price = Number(role.price ?? 0) || 0;
  const designerCost = Number(role.designerCostUsd ?? 0) || 0;
  const taxPercent = Number(role.taxPercent ?? 0) || 0;
  const otherCost = Number(role.otherCostUsd ?? 0) || 0;
  const taxCost = price * (taxPercent / 100);
  const totalCost = designerCost + taxCost + otherCost;
  return {
    price,
    designerCost,
    taxPercent,
    otherCost,
    taxCost,
    totalCost,
    profit: price - totalCost,
  };
}

function nearlyEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.00001;
}

async function responseErrorMessage(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return fallback;
  try {
    const payload = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = payload.error ?? payload.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // Use the raw response text below.
  }
  return text.trim() || fallback;
}

function draftFromProduct(product: Product) {
  const existingRoles = product.familyRoles?.length
    ? product.familyRoles
    : product.groomPriceUsd
      ? [
          {
            label: "Women",
            icon: "",
            price: product.priceUsd,
            gender: "female" as const,
          },
          {
            label: "Men",
            icon: "",
            price: product.groomPriceUsd,
            gender: "male" as const,
          },
        ]
      : [];
  const sourceRoles = existingRoles.length ? existingRoles : DETAIL_ROLE_TEMPLATES;
  const sourceByKey = new Map(sourceRoles.map((role) => [roleKey(role), role]));
  const normalizedRoles = DETAIL_ROLE_TEMPLATES.map((template) => {
    const role = sourceByKey.get(roleKey(template)) ?? template;
    return roleKey(template) === "woman:standard" && !role.price
      ? { ...role, price: String(product.priceUsd ?? "") }
      : role;
  });
  return {
    name: product.name ?? "",
    description: product.description ?? "",
    priceUsd: String(product.priceUsd ?? ""),
    groomPriceUsd: String(product.groomPriceUsd ?? ""),
    designerCostUsd: String(product.profitCostSetting?.designerCostUsd ?? ""),
    taxPercent: String(product.profitCostSetting?.taxPercent ?? ""),
    otherCostUsd: String(product.profitCostSetting?.otherCostUsd ?? ""),
    gender: product.gender ?? "female",
    fabricType: product.fabricType ?? "",
    embroideryStyle: product.embroideryStyle ?? "",
    tailoringDays: String(product.tailoringDays ?? 30),
    imagesText: (product.images ?? []).join("\n"),
    familyRoles: normalizedRoles.map((role) => ({
      label: role.label,
      icon: role.icon ?? "",
      price: String(role.price ?? ""),
      gender: role.gender ?? "unisex",
      customerType: role.customerType,
      outfitOption: role.outfitOption,
      description: role.description,
      designerCostUsd: String(role.designerCostUsd ?? product.profitCostSetting?.designerCostUsd ?? ""),
      taxPercent: String(role.taxPercent ?? product.profitCostSetting?.taxPercent ?? ""),
      otherCostUsd: String(role.otherCostUsd ?? product.profitCostSetting?.otherCostUsd ?? ""),
    })) satisfies DraftRole[],
  };
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-sm font-extrabold capitalize text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
        {label}
      </p>
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
  const [selectedImage, setSelectedImage] = useState(
    initialProduct.images?.[0] ?? "",
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(draftFromProduct(initialProduct));
  const [estimateDraft, setEstimateDraft] = useState<EstimateDraft>(estimateDraftFromProduct(initialProduct));
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const images = product.images?.filter(Boolean) ?? [];
  const activeImage = images.includes(selectedImage)
    ? selectedImage
    : (images[0] ?? "");

  const nameParts = (product.name || "").split(" — ");
  const cleanProductName = nameParts[0];
  const displayUniqueId =
    product.uniqueId ||
    (nameParts.length > 1
      ? nameParts[1]
      : product.id.slice(0, 8).toUpperCase());
  const designerCost =
    Number(product.profitCostSetting?.designerCostUsd ?? 0) || 0;
  const taxPercent = Number(product.profitCostSetting?.taxPercent ?? 0) || 0;
  const otherCost = Number(product.profitCostSetting?.otherCostUsd ?? 0) || 0;
  const productionTaxCost =
    (Number(product.priceUsd ?? 0) || 0) * (taxPercent / 100);
  const productionUnitCost = designerCost + productionTaxCost + otherCost;
  const unitProfit = (Number(product.priceUsd ?? 0) || 0) - productionUnitCost;

  function isDirty() {
    const original = draftFromProduct(product);
    return (
      original.name !== draft.name ||
      original.description !== draft.description ||
      original.priceUsd !== draft.priceUsd ||
      original.groomPriceUsd !== draft.groomPriceUsd ||
      original.designerCostUsd !== draft.designerCostUsd ||
      original.taxPercent !== draft.taxPercent ||
      original.otherCostUsd !== draft.otherCostUsd ||
      original.gender !== draft.gender ||
      original.fabricType !== draft.fabricType ||
      original.embroideryStyle !== draft.embroideryStyle ||
      original.tailoringDays !== draft.tailoringDays ||
      original.imagesText !== draft.imagesText ||
      JSON.stringify(original.familyRoles) !== JSON.stringify(draft.familyRoles)
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

  async function confirmAction(
    title: string,
    text: string,
    confirmButtonText: string,
    icon: "warning" | "question" = "warning",
  ) {
    return dashboardConfirm({
      title,
      text,
      confirmButtonText,
      cancelButtonText: "No, cancel",
      tone: confirmButtonText.toLowerCase().includes("delete")
        ? "danger"
        : "success",
      icon,
    });
  }

  function showResult(type: "success" | "error", message: string) {
    void (type === "success"
      ? dashboardSuccess("Success", message)
      : dashboardError("Something went wrong", message));
  }

  async function loadFreshProduct(fallback?: Product) {
    const response = await fetch(`/api/backend/admin/products/${product.id}`);
    if (!response.ok)
      throw new Error(
        await responseErrorMessage(response, "Product refresh failed"),
      );
    const payload = (await response.json()) as { data?: Product };
    return payload.data ?? fallback ?? product;
  }

  async function patchProduct(
    patch: ProductPatch,
    successMessage: string,
    expectedTaxPercent?: number,
  ) {
    if (!canEdit) {
      showResult("error", "You do not have permission to edit products.");
      return;
    }
    setBusy("patch");
    try {
      const response = await fetch(
        `/api/backend/admin/products/${product.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) {
        throw new Error(
          await responseErrorMessage(response, "Product update failed"),
        );
      }
      const payload = (await response.json()) as { data?: Product };
      const freshProduct = await loadFreshProduct(payload.data);
      if (expectedTaxPercent !== undefined) {
        const savedTaxPercent = Number(
          freshProduct.profitCostSetting?.taxPercent ?? Number.NaN,
        );
        if (
          !Number.isFinite(savedTaxPercent) ||
          !nearlyEqual(savedTaxPercent, expectedTaxPercent)
        ) {
          throw new Error(
            "Production tax rate was not saved correctly. Please try again.",
          );
        }
      }
      setProduct(freshProduct);
      setDraft(draftFromProduct(freshProduct));
      setEstimateDraft(estimateDraftFromProduct(freshProduct));
      setSelectedImage(freshProduct.images?.[0] ?? "");
      showResult("success", successMessage);
      router.refresh();
    } catch (error) {
      showResult(
        "error",
        error instanceof Error ? error.message : "Product update failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive() {
    if (!canEdit) return;
    const nextActive = !product.isActive;
    const confirmed = await confirmAction(
      nextActive ? "Activate product?" : "Deactivate product?",
      nextActive
        ? "This product will become visible to customers."
        : "This product will be hidden from customers.",
      nextActive ? "Activate" : "Deactivate",
    );
    if (confirmed)
      await patchProduct(
        { isActive: nextActive },
        nextActive
          ? "Product activated successfully."
          : "Product deactivated successfully.",
      );
  }

  async function toggleFeatured() {
    if (!canEdit) return;
    const nextFeatured = !product.isFeatured;
    const confirmed = await confirmAction(
      nextFeatured ? "Feature product?" : "Remove feature?",
      nextFeatured
        ? "This product can be highlighted on the home page."
        : "This product will no longer be highlighted.",
      nextFeatured ? "Feature" : "Remove feature",
      "question",
    );
    if (confirmed)
      await patchProduct(
        { isFeatured: nextFeatured },
        nextFeatured
          ? "Product featured successfully."
          : "Product feature removed successfully.",
      );
  }

  async function deleteProduct() {
    if (!canDelete) {
      showResult("error", "You do not have permission to delete products.");
      return;
    }
    const confirmed = await confirmAction(
      "Delete product?",
      "This will permanently delete the product from inventory and remove it from the storefront.",
      "Delete",
    );
    if (!confirmed) return;
    setBusy("delete");
    try {
      const response = await fetch(
        `/api/backend/admin/products/${product.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await responseErrorMessage(response, "Product delete failed"),
        );
      }
      await dashboardSuccess("Deleted", "Product deleted successfully.");
      router.push("/admin/inventory");
      router.refresh();
    } catch (error) {
      showResult(
        "error",
        error instanceof Error ? error.message : "Product delete failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!canEdit) return;
    let designerCostUsd: number;
    let taxPercent: number;
    let otherCostUsd: number;
    try {
      parseRequiredNumber(draft.priceUsd, "Base selling price");
      designerCostUsd = parseRequiredNumber(
        draft.designerCostUsd,
        "Designer labor cost",
      );
      taxPercent = parseRequiredNumber(draft.taxPercent, "Production tax rate");
      otherCostUsd = parseRequiredNumber(
        draft.otherCostUsd,
        "Other production costs",
      );
      for (const role of draft.familyRoles) {
        if (!role.price.trim() || Number(role.price) <= 0) continue;
        parseRequiredNumber(role.designerCostUsd || "0", `${role.label} designer labor cost`);
        parseRequiredNumber(role.taxPercent || "0", `${role.label} production tax rate`);
        parseRequiredNumber(role.otherCostUsd || "0", `${role.label} other production costs`);
      }
    } catch (error) {
      showResult(
        "error",
        error instanceof Error
          ? error.message
          : "Production cost values are invalid.",
      );
      return;
    }
    const confirmed = await confirmAction(
      "Save product changes?",
      "This will update the product information shown in admin and storefront.",
      "Save",
      "question",
    );
    if (!confirmed) return;
    await patchProduct(
      {
        name: draft.name,
        description: draft.description,
        priceUsd: Number(draft.priceUsd),
        groomPriceUsd: draft.groomPriceUsd ? Number(draft.groomPriceUsd) : null,
        designerCostUsd,
        taxPercent,
        otherCostUsd,
        familyRoles: draft.familyRoles.filter((role) => Number(role.price) > 0).length
          ? draft.familyRoles.filter((role) => Number(role.price) > 0).map((role) => ({
              label: role.label,
              icon: role.icon || undefined,
              price: Number(role.price),
              gender: role.gender,
              customerType: role.customerType,
              outfitOption: role.outfitOption,
              description: role.description,
              designerCostUsd: Number(role.designerCostUsd || 0),
              taxPercent: Number(role.taxPercent || 0),
              otherCostUsd: Number(role.otherCostUsd || 0),
            }))
          : undefined,
        gender: draft.gender as Product["gender"],
        fabricType: draft.fabricType,
        embroideryStyle: draft.embroideryStyle,
        tailoringDays: Number(draft.tailoringDays),
        images: parseImages(draft.imagesText),
      },
      "Product updated successfully.",
      taxPercent,
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

    return uploadFileToS3(file, "products");
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
        imagesText: [...parseImages(current.imagesText), ...uploadedUrls].join("\n"),
      }));
      showResult(
        "success",
        `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} added. Click Save changes to update.`,
      );
    } catch (error) {
      showResult(
        "error",
        error instanceof Error ? error.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveEstimatedPrices() {
    if (!canEdit) return;
    let prices: Record<EstimateKey, number>;
    try {
      prices = {
        men: parseRequiredNumber(estimateDraft.men, "Men estimated price"),
        woman: parseRequiredNumber(estimateDraft.woman, "Woman estimated price"),
        boy: parseRequiredNumber(estimateDraft.boy, "Boy estimated price"),
        girl: parseRequiredNumber(estimateDraft.girl, "Girl estimated price"),
      };
      if (Object.values(prices).some((price) => price <= 0)) throw new Error("Every estimated price must be greater than zero.");
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Estimated prices are invalid.");
      return;
    }
    const confirmed = await dashboardConfirm({
      title: "Save estimated prices?",
      text: "This will update the pending estimates and the original Telegram post.",
      confirmButtonText: "Save Estimates",
      cancelButtonText: "Cancel",
      tone: "success",
      icon: "question",
    });
    if (!confirmed) return;
    setBusy("estimated-save");
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}/estimated-prices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices),
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Estimated price update failed"));
      const payload = (await response.json()) as { data?: Product };
      const freshProduct = payload.data ?? await loadFreshProduct();
      setProduct(freshProduct);
      setDraft(draftFromProduct(freshProduct));
      setEstimateDraft(estimateDraftFromProduct(freshProduct));
      showResult("success", "Estimated prices and the Telegram post were updated.");
      router.refresh();
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : "Estimated price update failed");
    } finally {
      setBusy(null);
    }
  }

  async function decideEstimatedPrices(decision: "approve" | "decline") {
    if (!canEdit) return;
    const approved = decision === "approve";
    const confirmed = await dashboardConfirm({
      title: approved ? "Approve estimated prices?" : "Decline estimated prices?",
      text: approved
        ? "Approved estimates will become the active product and storefront prices."
        : "The Telegram post will request a new price submission.",
      confirmButtonText: approved ? "Approve Prices" : "Decline Prices",
      cancelButtonText: "Cancel",
      tone: approved ? "success" : "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    setBusy(`estimated-${decision}`);
    try {
      const response = await fetch(`/api/backend/admin/products/${product.id}/estimated-prices/${decision}`, { method: "POST" });
      if (!response.ok) throw new Error(await responseErrorMessage(response, `Price ${decision} failed`));
      const payload = (await response.json()) as { data?: Product };
      const freshProduct = payload.data ?? await loadFreshProduct();
      setProduct(freshProduct);
      setDraft(draftFromProduct(freshProduct));
      setEstimateDraft(estimateDraftFromProduct(freshProduct));
      showResult("success", approved ? "Estimated prices approved and published." : "Estimated prices declined. Telegram now requests another submission.");
      router.refresh();
    } catch (error) {
      showResult("error", error instanceof Error ? error.message : `Price ${decision} failed`);
    } finally {
      setBusy(null);
    }
  }

  function removeDraftImage(indexToRemove: number) {
    const currentImages = parseImages(draft.imagesText);
    const removedImage = currentImages[indexToRemove];
    const nextImages = currentImages.filter((_, index) => index !== indexToRemove);
    setDraft((current) => ({
      ...current,
      imagesText: nextImages.join("\n"),
    }));
    if (removedImage && removedImage === selectedImage) {
      setSelectedImage(nextImages[0] ?? "");
    }
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
            <EditableField
              label="Product Name"
              value={draft.name}
              onChange={(v) => setDraft((c) => ({ ...c, name: v }))}
              placeholder="Outfit name"
            />
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                Description
              </p>
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, description: e.target.value }))
                }
                placeholder="Tell us about the design, context, or significance of this outfit..."
                className="w-full min-h-28 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ReadOnlyField label="Product Name" value={cleanProductName} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Description
              </p>
              <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                {product.description ||
                  "No product description has been added yet."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Tribe" value={product.region} />
              <ReadOnlyField
                label="Region"
                value={product.subcategory || "—"}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPricing() {
    const displayRoles = product.familyRoles?.length
      ? product.familyRoles
      : draftFromProduct(product).familyRoles;
    const summaryRoles = [
      { key: "woman", label: "Women's Traditional Outfit", price: product.priceUsd },
      { key: "man", label: "Men's Traditional Outfit", price: displayRoles.find((role) => role.customerType === "man" && role.outfitOption === "full_set")?.price },
      { key: "girl", label: "Girls' Traditional Outfit", price: displayRoles.find((role) => role.customerType === "girl")?.price },
      { key: "boy", label: "Boys' Traditional Outfit", price: displayRoles.find((role) => role.customerType === "boy" && role.outfitOption === "full_set")?.price },
    ];
    function updateDraftRole(index: number, patch: Partial<DraftRole>) {
      setDraft((current) => ({
        ...current,
        familyRoles: current.familyRoles.map((role, roleIndex) =>
          roleIndex === index ? { ...role, ...patch } : role,
        ),
      }));
    }

    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <DollarSign className="h-4 w-4" /> Pricing & Cost
        </h3>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <EditableField
                label="USD Price"
                value={draft.priceUsd}
                onChange={(v) => setDraft((c) => ({ ...c, priceUsd: v }))}
                type="number"
                placeholder="0.00"
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  ETB Equivalent
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatEtb(draft.priceUsd || 0)}
                </p>
              </div>
              <EditableField
                label="Men's Traditional Outfit Price (USD)"
                value={draft.groomPriceUsd}
                onChange={(v) => setDraft((c) => ({ ...c, groomPriceUsd: v }))}
                type="number"
                placeholder="Optional"
              />
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
              <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Production Cost Detail
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <EditableField
                  label="Designer Labor Cost"
                  value={draft.designerCostUsd}
                  onChange={(v) =>
                    setDraft((c) => ({ ...c, designerCostUsd: v }))
                  }
                  type="number"
                  placeholder="0.00"
                />
                <EditableField
                  label="Production Tax Rate (%)"
                  value={draft.taxPercent}
                  onChange={(v) => setDraft((c) => ({ ...c, taxPercent: v }))}
                  type="number"
                  placeholder="0"
                />
                <EditableField
                  label="Other Production Costs"
                  value={draft.otherCostUsd}
                  onChange={(v) => setDraft((c) => ({ ...c, otherCostUsd: v }))}
                  type="number"
                  placeholder="0.00"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ReadOnlyField
                  label="Estimated Unit Cost"
                  value={formatCurrency(
                    (Number(draft.designerCostUsd || 0) || 0) +
                      (Number(draft.priceUsd || 0) || 0) *
                        ((Number(draft.taxPercent || 0) || 0) / 100) +
                      (Number(draft.otherCostUsd || 0) || 0),
                  )}
                />
                <ReadOnlyField
                  label="Estimated Unit Profit"
                  value={formatCurrency(
                    (Number(draft.priceUsd || 0) || 0) -
                      ((Number(draft.designerCostUsd || 0) || 0) +
                        (Number(draft.priceUsd || 0) || 0) *
                          ((Number(draft.taxPercent || 0) || 0) / 100) +
                        (Number(draft.otherCostUsd || 0) || 0)),
                  )}
                />
                <ReadOnlyField
                  label="Tax Cost From Price"
                  value={formatCurrency(
                    (Number(draft.priceUsd || 0) || 0) *
                      ((Number(draft.taxPercent || 0) || 0) / 100),
                  )}
                />
              </div>
            </div>
            {draft.familyRoles.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Role-Based Production Cost
                </p>
                <div className="space-y-3">
                  {draft.familyRoles.map((role, index) => {
                    const cost = roleProductionCost(role);
                    return (
                      <div key={`${role.label}-${index}`} className="grid gap-3 rounded-xl border border-amber-100 bg-white p-4 lg:grid-cols-6">
                        <ReadOnlyField label="Role" value={role.label} />
                        <EditableField
                          label="Selling Price"
                          value={role.price}
                          onChange={(v) => updateDraftRole(index, { price: v })}
                          type="number"
                        />
                        <EditableField
                          label="Designer Cost"
                          value={role.designerCostUsd}
                          onChange={(v) => updateDraftRole(index, { designerCostUsd: v })}
                          type="number"
                        />
                        <EditableField
                          label="Tax %"
                          value={role.taxPercent}
                          onChange={(v) => updateDraftRole(index, { taxPercent: v })}
                          type="number"
                        />
                        <EditableField
                          label="Other Cost"
                          value={role.otherCostUsd}
                          onChange={(v) => updateDraftRole(index, { otherCostUsd: v })}
                          type="number"
                        />
                        <ReadOnlyField label="Role Profit" value={formatCurrency(cost.profit)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryRoles.map((role, index) => (
                <div key={role.key} className={cn("rounded-2xl border p-5", index === 0 ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50")}>
                  <p className={cn("text-xs font-bold uppercase tracking-widest", index === 0 ? "text-emerald-700" : "text-slate-500")}>
                    {role.label}
                  </p>
                  <p className={cn("mt-2 text-2xl font-extrabold", index === 0 ? "text-emerald-800" : "text-slate-950")}>
                    {role.price && Number(role.price) > 0 ? formatCurrency(role.price) : "Not set"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {role.price && Number(role.price) > 0 ? formatEtb(role.price) : "Optional price"}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Production Cost Detail
                </p>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Profit {formatCurrency(unitProfit)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ReadOnlyField
                  label="Designer Labor Cost"
                  value={formatCurrency(designerCost)}
                />
                <ReadOnlyField
                  label="Production Tax Rate"
                  value={formatPercent(taxPercent)}
                />
                <ReadOnlyField
                  label="Tax Cost From Price"
                  value={formatCurrency(productionTaxCost)}
                />
                <ReadOnlyField
                  label="Other Production Costs"
                  value={formatCurrency(otherCost)}
                />
                <ReadOnlyField
                  label="Estimated Unit Cost"
                  value={formatCurrency(productionUnitCost)}
                />
                <ReadOnlyField
                  label="Estimated Net Profit"
                  value={formatCurrency(unitProfit)}
                />
              </div>
            </div>
            {displayRoles.length ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Role-Based Production Cost
                </p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {displayRoles.map((role, index) => {
                    const cost = roleProductionCost({
                      price: role.price,
                      designerCostUsd: role.designerCostUsd ?? designerCost,
                      taxPercent: role.taxPercent ?? taxPercent,
                      otherCostUsd: role.otherCostUsd ?? otherCost,
                    });
                    return (
                      <div key={`${role.label}-${index}`} className="rounded-xl border border-amber-100 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-black text-slate-900">{role.label}</p>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                            Profit {formatCurrency(cost.profit)}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <ReadOnlyField label="Selling Price" value={formatCurrency(role.price)} />
                          <ReadOnlyField label="Designer Cost" value={formatCurrency(cost.designerCost)} />
                          <ReadOnlyField label="Tax Rate" value={formatPercent(cost.taxPercent)} />
                          <ReadOnlyField label="Other Cost" value={formatCurrency(cost.otherCost)} />
                          <ReadOnlyField label="Total Cost" value={formatCurrency(cost.totalCost)} />
                          <ReadOnlyField label="Net Profit" value={formatCurrency(cost.profit)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                Gender
              </p>
              <select
                value={draft.gender}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    gender: e.target.value as Product["gender"],
                  }))
                }
                className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <EditableField
              label="Fabric Texture"
              value={draft.fabricType}
              onChange={(v) => setDraft((c) => ({ ...c, fabricType: v }))}
              placeholder="e.g. Pure Cotton"
            />
            <EditableField
              label="Embroidery Style"
              value={draft.embroideryStyle}
              onChange={(v) => setDraft((c) => ({ ...c, embroideryStyle: v }))}
              placeholder="e.g. Traditional Tilet"
            />
            <EditableField
              label="Estimated Delivery Days"
              value={draft.tailoringDays}
              onChange={(v) => setDraft((c) => ({ ...c, tailoringDays: v }))}
              type="number"
              placeholder="30"
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ReadOnlyField label="Product ID" value={displayUniqueId} />
            <ReadOnlyField label="Gender" value={product.gender} />
            <ReadOnlyField
              label="Fabric Texture"
              value={product.fabricType || "—"}
            />
            <ReadOnlyField
              label="Embroidery Style"
              value={product.embroideryStyle || "—"}
            />
            <ReadOnlyField
              label="Estimated Delivery Days"
              value={`${product.tailoringDays ?? 30} days`}
            />
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
              <p className="text-[10px] font-bold text-slate-400">
                Home page hero boost
              </p>
            </div>
            {canEdit ? (
              <button
                onClick={() => void toggleFeatured()}
                disabled={Boolean(busy)}
                className={cn(
                  "relative inline-flex h-7 w-12 rounded-full p-1 transition-all duration-300",
                  product.isFeatured
                    ? "bg-amber-500 shadow-amber-200 shadow-md"
                    : "bg-slate-200",
                  busy && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full bg-white shadow transition-all duration-300",
                    product.isFeatured ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            ) : null}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900 leading-none flex items-center gap-2">
                {product.isActive ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                )}{" "}
                Publicly Active
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                Visible for customers
              </p>
            </div>
            {canEdit ? (
              <button
                onClick={() => void toggleActive()}
                disabled={Boolean(busy)}
                className={cn(
                  "relative inline-flex h-7 w-12 rounded-full p-1 transition-all duration-300",
                  product.isActive
                    ? "bg-emerald-500 shadow-emerald-200 shadow-md"
                    : "bg-slate-200",
                  busy && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full bg-white shadow transition-all duration-300",
                    product.isActive ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            ) : null}
          </div>
        </div>

        {/* Current status display */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnlyField
            label="Visibility Status"
            value={product.isActive ? "Active (Visible)" : "Hidden"}
          />
          <ReadOnlyField
            label="Home Page Highlight"
            value={product.isFeatured ? "Featured" : "Normal"}
          />
        </div>
      </div>
    );
  }

  function renderImagesManager() {
    const displayImages = editing ? parseImages(draft.imagesText) : images;
    const activeDisplayImage = displayImages.includes(selectedImage)
      ? selectedImage
      : (displayImages[0] ?? "");
    return (
      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <ImageIcon className="h-4 w-4" /> Images Manager
        </h3>

        {/* Gallery */}
        <div className="grid grid-cols-4 gap-3">
          {displayImages.map((image, index) => (
            <div key={`${image}-${index}`} className="relative aspect-square">
              <button
                type="button"
                onClick={() => image && setSelectedImage(image)}
                className={cn(
                  "h-full w-full overflow-hidden rounded-xl border-2 bg-slate-100 transition-all hover:scale-[1.03]",
                  image && image === activeDisplayImage
                    ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg"
                    : "border-slate-200",
                )}
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </button>
              {editing && image ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeDraftImage(index);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition-colors hover:bg-rose-700"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {displayImages.length === 0 && (
            <div className="col-span-4 py-10 text-center text-xs font-bold uppercase text-slate-400 tracking-widest">
              No images available
            </div>
          )}
        </div>

        {/* Active image large preview */}
        {activeDisplayImage && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            <img
              src={activeDisplayImage}
              alt=""
              className="aspect-[4/5] w-full object-cover"
            />
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
            {uploading && (
              <span className="block text-xs font-semibold text-emerald-700 animate-pulse">
                Uploading images...
              </span>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">
                Image URLs (one per line)
              </label>
              <textarea
                value={draft.imagesText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    imagesText: event.target.value,
                  }))
                }
                placeholder="Paste Cloudinary or other image links here"
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold font-mono outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderEstimatedPrices() {
    const status = product.priceStatus ?? "draft";
    const canDecide = status === "pending_approval" || status === "submitted";
    const statusTone = status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : canDecide
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700"><BadgeDollarSign className="h-4 w-4" /> Estimated Prices</h3>
            <p className="mt-2 text-xs font-semibold text-slate-500">Prices submitted from Telegram remain estimates until an administrator approves them.</p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusTone)}>{status.replaceAll("_", " ")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ESTIMATE_FIELDS.map((field) => {
            const role = product.familyRoles?.find((item) => item.customerType === field.customerType && Number(item.designerPriceEtb) > 0);
            const sellingEstimate = Number(role?.sellingPriceEtb ?? (Number(estimateDraft[field.key]) || 0));
            return (
              <div key={field.key} className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">{field.label} estimate (ETB)</span>
                  <input type="number" min="0.01" step="0.01" disabled={!canEdit || Boolean(busy)} value={estimateDraft[field.key]} onChange={(event) => setEstimateDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder="0.00" className="mt-2 h-12 w-full rounded-xl border border-indigo-200 bg-white px-4 text-lg font-black text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-100" />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-3"><p className="font-bold text-slate-400">Markup</p><p className="mt-1 font-black text-slate-800">{Number(role?.markupAmountEtb ?? 0).toLocaleString()} ETB</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="font-bold text-slate-400">Estimated selling</p><p className="mt-1 font-black text-emerald-700">{sellingEstimate.toLocaleString()} ETB</p></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Submitted" value={product.lastPriceSubmittedAt ? new Date(product.lastPriceSubmittedAt).toLocaleString() : "Not submitted"} />
          <ReadOnlyField label="Submission count" value={String(product.priceSubmissionCount ?? 0)} />
          <ReadOnlyField label="Price version" value={String(product.priceVersion ?? 0)} />
          <ReadOnlyField label="Telegram status" value={(product.telegramStatus ?? "not sent").replaceAll("_", " ")} />
        </div>
        {canEdit ? <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => void saveEstimatedPrices()} className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-indigo-700 disabled:opacity-50">{busy === "estimated-save" ? "Saving…" : "Save Changes"}</button>
          {canDecide ? <>
            <button type="button" disabled={Boolean(busy)} onClick={() => void decideEstimatedPrices("decline")} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{busy === "estimated-decline" ? "Declining…" : "Decline"}</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void decideEstimatedPrices("approve")} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{busy === "estimated-approve" ? "Approving…" : "Approve"}</button>
          </> : null}
        </div> : null}
      </div>
    );
  }

  function renderTelegramPricing() {
    const statusLabel = (value?: string | null) => value ? value.replaceAll("_", " ") : "Not set";
    const toggleTelegram = async () => {
      const enabled = !product.sendToTelegram;
      const confirmed = await dashboardConfirm({ title: enabled ? "Enable Telegram pricing?" : "Disable Telegram pricing?", text: enabled ? "This product will be sent to its region pricing topic." : "This product will no longer be sent for Telegram price collection.", confirmButtonText: enabled ? "Enable" : "Disable", cancelButtonText: "Cancel", tone: enabled ? "success" : "danger", icon: enabled ? "question" : "warning" });
      if (!confirmed) return;
      await patchProduct({ sendToTelegram: enabled, priceStatus: enabled ? "waiting_price" : "draft" }, enabled ? "Telegram pricing enabled. The product will be sent to its region topic." : "Telegram pricing disabled.");
    };
    const resendTelegram = async () => {
      const confirmed = await dashboardConfirm({ title: "Resend product to Telegram?", text: "The product will be sent again to its region pricing topic.", confirmButtonText: "Resend Now", cancelButtonText: "Cancel", tone: "success", icon: "question" });
      if (!confirmed) return;
      setBusy("telegram-resend");
      try {
        const response = await fetch(`/api/backend/admin/products/${product.id}/telegram/resend`, { method: "POST" });
        if (!response.ok) throw new Error(await responseErrorMessage(response, "Telegram resend failed"));
        const payload = (await response.json()) as { data?: Product };
        const freshProduct = await loadFreshProduct(payload.data);
        setProduct(freshProduct);
        setDraft(draftFromProduct(freshProduct));
        setEstimateDraft(estimateDraftFromProduct(freshProduct));
        showResult("success", "Product resent to Telegram successfully.");
      } catch (error) { showResult("error", error instanceof Error ? error.message : "Telegram resend failed"); }
      finally { setBusy(null); }
    };
    return (
      <div className="space-y-5">
        <div><h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700"><Send className="h-4 w-4" /> Telegram Pricing Workflow</h3><p className="mt-2 text-xs font-semibold text-slate-500">Route this product to its region topic, collect prices, and track submission history.</p></div>
        <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5"><div><p className="text-xs font-black uppercase text-slate-900">Send to Telegram Pricing Group</p><p className="mt-1 text-[10px] font-bold text-slate-500">ON sends the product to the matching region topic.</p></div>{canEdit ? <div className="flex items-center gap-3"><button type="button" onClick={() => void resendTelegram()} disabled={Boolean(busy) || !product.sendToTelegram} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[10px] font-black text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{busy === "telegram-resend" ? "Resending…" : "Resend Now"}</button><button type="button" onClick={() => void toggleTelegram()} disabled={Boolean(busy)} className={cn("relative inline-flex h-7 w-14 rounded-full p-1 transition-all", product.sendToTelegram ? "bg-indigo-700" : "bg-slate-300")}><span className={cn("h-5 w-5 rounded-full bg-white transition-all", product.sendToTelegram ? "translate-x-7" : "translate-x-0")} /></button></div> : null}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label="Region Topic" value={`${product.region}${product.subcategory ? ` / ${product.subcategory}` : ""}`} /><ReadOnlyField label="Telegram Status" value={statusLabel(product.telegramStatus)} /><ReadOnlyField label="Topic ID" value={product.telegramTopicId || "Not created"} /><ReadOnlyField label="Message ID" value={product.telegramMessageId || "Not sent"} /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label="Price Status" value={statusLabel(product.priceStatus)} /><ReadOnlyField label="Submission Count" value={String(product.priceSubmissionCount ?? 0)} /><ReadOnlyField label="Price Version" value={String(product.priceVersion ?? 0)} /><ReadOnlyField label="Last Submitted" value={product.lastPriceSubmittedAt ? new Date(product.lastPriceSubmittedAt).toLocaleString() : "Not submitted"} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><ReadOnlyField label="Last Approved" value={product.lastPriceApprovedAt ? new Date(product.lastPriceApprovedAt).toLocaleString() : "Not approved"} /><ReadOnlyField label="Product ID" value={displayUniqueId} /></div>
        {(product.priceStatus === "pending_approval" || product.priceStatus === "submitted") ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Review, edit, approve, or decline this submission in the Estimated Prices section.</p> : null}
      </div>
    );
  }

  const tabRenderers: Record<TabKey, () => React.ReactNode> = {
    info: renderProductInfo,
    pricing: renderPricing,
    estimated: renderEstimatedPrices,
    garment: renderGarmentSpecs,
    storefront: renderStorefrontControls,
    telegram: renderTelegramPricing,
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
                Manage product details, pricing, inventory, and storefront
                visibility.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden lg:block text-right mr-2 max-w-xs xl:max-w-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                Full Name
              </p>
              <p
                className="text-sm font-bold text-slate-600 truncate"
                title={cleanProductName}
              >
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
                <img
                  src={activeImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400 uppercase">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Center: Info + Badges */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
            <div>
              <h2
                className="text-xl font-black text-slate-900 uppercase tracking-tight truncate"
                title={cleanProductName}
              >
                {cleanProductName}
              </h2>
              <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                Product ID: {displayUniqueId}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                  product.isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200",
                )}
              >
                {product.isActive ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {product.isActive ? "Active" : "Hidden"}
              </span>
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 border border-amber-200">
                  <Star className="h-3 w-3" /> Featured
                </span>
              )}
              {product.subcategory && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">
                  {product.subcategory}
                </span>
              )}
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                {product.region}
              </span>
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
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
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
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
