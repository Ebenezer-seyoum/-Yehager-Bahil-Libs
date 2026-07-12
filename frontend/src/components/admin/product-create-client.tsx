"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  DollarSign,
  Shirt,
  ChevronDown,
  Info,
  ShieldCheck,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardConfirm,
  dashboardSuccess,
  dashboardError,
} from "@/lib/dashboard-swal";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";
import { uploadFileToS3 } from "@/lib/uploads";
import { friendlyErrorMessage } from "@/lib/friendly-errors";

type BulkProduct = {
  id: string;
  folderName: string;
  middleText: string;
  files: File[];
  priceUsd: string;
  designerCostUsd: string;
  taxPercent: string;
  otherCostUsd: string;
  outfitOptions: OutfitOptionDraft[];
  productionMaterials: ProductionMaterialDraft[];
  pricingOpen: boolean;
  region: string;
  subcategory: string;
  gender: string;
  fabricType: string;
  embroideryStyle: string;
  tailoringDays: string;
  isFeatured: boolean;
  isActive: boolean;
  import: boolean;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
};

type HomepageSection = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  collections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
  subsections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
};

type ExistingProduct = {
  id: string;
  region?: string | null;
  subcategory?: string | null;
};

type OutfitOptionDraft = {
  label: string;
  customerType: "woman" | "man" | "girl" | "boy";
  outfitOption: "standard" | "full_set" | "top_only" | "pants_only";
  gender: "male" | "female" | "unisex";
  description: string;
  price: string;
  designerCostUsd: string;
  taxPercent: string;
  otherCostUsd: string;
};

type ProductionMaterialDraft = {
  id: string;
  name: string;
  optionKey: string;
  unit: "meter" | "piece" | "roll" | "pack" | "gram" | "kg";
  requiredQty: string;
  availableQty: string;
  lowStockLevel: string;
  note: string;
};

const OPTION_PRICING_TEMPLATE: Array<Omit<OutfitOptionDraft, "price" | "designerCostUsd" | "taxPercent" | "otherCostUsd">> = [
  { label: "Men - Full Set", customerType: "man", outfitOption: "full_set", gender: "male", description: "Top + pants" },
  { label: "Men - Tishri / Top", customerType: "man", outfitOption: "top_only", gender: "male", description: "Top garment only" },
  { label: "Men - Pants", customerType: "man", outfitOption: "pants_only", gender: "male", description: "Pants only" },
  { label: "Girl Outfit", customerType: "girl", outfitOption: "standard", gender: "female", description: "Child girl outfit" },
  { label: "Boy - Full Set", customerType: "boy", outfitOption: "full_set", gender: "male", description: "Top + pants" },
  { label: "Boy - Tishri / Top", customerType: "boy", outfitOption: "top_only", gender: "male", description: "Top garment only" },
  { label: "Boy - Pants", customerType: "boy", outfitOption: "pants_only", gender: "male", description: "Pants only" },
];

const CUSTOMER_GROUPS = [
  { key: "man", label: "Men" },
  { key: "woman", label: "Women" },
  { key: "boy", label: "Boy" },
  { key: "girl", label: "Girl" },
] as const;

const MATERIAL_UNITS: ProductionMaterialDraft["unit"][] = ["meter", "piece", "roll", "pack", "gram", "kg"];

function optionKey(role: Pick<OutfitOptionDraft, "customerType" | "outfitOption">) {
  return `${role.customerType}:${role.outfitOption}`;
}

function initialOptionPricing(): OutfitOptionDraft[] {
  return OPTION_PRICING_TEMPLATE.map((option) => ({
    ...option,
    price: "",
    designerCostUsd: "",
    taxPercent: "0",
    otherCostUsd: "0",
  }));
}

function initialProductionMaterials(): ProductionMaterialDraft[] {
  return [
    {
      id: Math.random().toString(36).slice(2, 9),
      name: "",
      optionKey: "all",
      unit: "meter",
      requiredQty: "",
      availableQty: "",
      lowStockLevel: "",
      note: "",
    },
  ];
}

function errorMessage(error: unknown) {
  return friendlyErrorMessage(error);
}

function fallbackHomepageSections(): HomepageSection[] {
  return REGIONS.map((name, index) => ({
    id: `fallback-${name}`,
    name,
    isActive: true,
    sortOrder: index,
    collections: (TAXONOMY[name] ?? []).map((subsection, subIndex) => ({
      id: `fallback-${name}-${subsection}`,
      name: subsection,
      isActive: true,
      sortOrder: subIndex,
    })),
  }));
}

function normalizeHomepageSections(
  sections: HomepageSection[] | undefined,
): HomepageSection[] {
  const mergedByName = new Map<string, HomepageSection>();

  [
    ...fallbackHomepageSections(),
    ...(Array.isArray(sections) ? sections : []),
  ].forEach((section, index) => {
    const name = section.name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const incomingCollections = (
      section.collections ??
      section.subsections ??
      []
    )
      .map((collection, collectionIndex) => ({
        ...collection,
        name: collection.name.trim(),
        isActive: collection.isActive ?? true,
        sortOrder: collection.sortOrder ?? collectionIndex,
      }))
      .filter((collection) => collection.name);
    const existing = mergedByName.get(key);

    if (!existing) {
      mergedByName.set(key, {
        ...section,
        name,
        isActive: section.isActive ?? true,
        sortOrder: section.sortOrder ?? index,
        collections: incomingCollections,
      });
      return;
    }

    const collectionsByName = new Map(
      (existing.collections ?? existing.subsections ?? []).map((collection) => [
        collection.name.trim().toLowerCase(),
        collection,
      ]),
    );
    incomingCollections.forEach((collection) => {
      if (!collectionsByName.has(collection.name.toLowerCase())) {
        collectionsByName.set(collection.name.toLowerCase(), collection);
      }
    });

    mergedByName.set(key, {
      ...existing,
      ...section,
      name,
      isActive: existing.isActive || section.isActive,
      sortOrder: Math.min(
        existing.sortOrder,
        section.sortOrder ?? existing.sortOrder,
      ),
      collections: Array.from(collectionsByName.values()).sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    });
  });

  return Array.from(mergedByName.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

// Tribe & region abbreviation helpers for generated product IDs.
function getRegionCode(r: string): string {
  const map: Record<string, string> = {
    Amhara: "AMH",
    Oromo: "ORO",
    Tigre: "TIG",
    Debub: "DEB",
    Islamic: "ISL",
    Men: "MEN",
    "Bride & Groom": "BDG",
    "Mila's Choice": "MIL",
  };
  return map[r] || r.slice(0, 3).toUpperCase();
}

function getSubcategoryCode(sub: string): string {
  if (!sub) return "GEN";
  const map: Record<string, string> = {
    Gondar: "GND",
    Wollega: "WLG",
    Shewa: "SHW",
    Arsi: "ARS",
    Jimma: "JIM",
    Borena: "BOR",
    Harar: "HAR",
    Guji: "GUJ",
    Kids: "KID",
    Apparels: "APP",
    Gojam: "GJM",
    Wollo: "WLO",
    Minjar: "MNJ",
    Raya: "RAY",
    Adigrat: "ADG",
    Axum: "AXM",
    Shire: "SHR",
    Chiffon: "CHF",
    Gurage: "GRG",
    Welaita: "WLT",
    Gamo: "GAM",
    Sidama: "SID",
    Modern: "MOD",
    Amhara: "AMH",
    Oromo: "ORO",
    Tigre: "TIG",
    Debub: "DEB",
  };
  return map[sub] || sub.slice(0, 3).toUpperCase();
}

function buildProductUniqueId(region: string, subcategory: string, nextNum: string) {
  return subcategory
    ? `${getRegionCode(region)}-${getSubcategoryCode(subcategory)}-${nextNum}`
    : `${getRegionCode(region)}-${nextNum}`;
}

function buildProductName(region: string, subcategory: string, middleText: string, uniqueId: string) {
  return [region, subcategory, middleText.trim()].filter(Boolean).join(" ") + ` - ${uniqueId}`;
}

export function ProductCreateClient() {
  const router = useRouter();
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadMode, setUploadMode] = useState<"single" | "multiple">("single");
  const [busy, setBusy] = useState(false);
  const [formNotice, setFormNotice] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Existing products list for increment counts
  const [existingProducts, setExistingProducts] = useState<ExistingProduct[]>(
    [],
  );
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(
    () => normalizeHomepageSections(undefined),
  );

  useEffect(() => {
    fetch("/api/backend/admin/products?limit=200")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setExistingProducts(json.data);
        }
      })
      .catch((err) =>
        console.error(
          "Error fetching existing products for auto-increment number",
          err,
        ),
      );

    fetch("/api/backend/admin/homepage-sections")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data)) {
          setHomepageSections(normalizeHomepageSections(json.data));
        }
      })
      .catch((err) =>
        console.error("Error fetching sections for product insert", err),
      );
  }, []);

  // Helper to compute increment number (handling local batch offsets)
  function getNextIncrementNumber(
    selectedRegion: string,
    selectedSub: string,
    offset = 0,
  ): string {
    const count = existingProducts.filter(
      (p) =>
        p.region?.toLowerCase() === selectedRegion.toLowerCase() &&
        (p.subcategory || "").toLowerCase() ===
          (selectedSub || "").toLowerCase(),
    ).length;
    return String(count + 1 + offset).padStart(3, "0");
  }

  // --- Single Product State ---
  const [region, setRegion] = useState(REGIONS[0]);
  const [subcategory, setSubcategory] = useState(
    TAXONOMY[REGIONS[0]]?.[0] || "",
  );
  const [middleText, setMiddleText] = useState("Traditional Family Outfit");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [designerCostUsd, setDesignerCostUsd] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [otherCostUsd, setOtherCostUsd] = useState("");
  const [outfitOptions, setOutfitOptions] = useState<OutfitOptionDraft[]>(() => initialOptionPricing());
  const [productionMaterials, setProductionMaterials] = useState<ProductionMaterialDraft[]>(() => initialProductionMaterials());
  const [openPricingGroups, setOpenPricingGroups] = useState<Record<string, boolean>>({
    man: true,
    woman: true,
    boy: false,
    girl: false,
  });
  const [openMaterials, setOpenMaterials] = useState(true);
  const [gender, setGender] = useState("female");
  const [fabricType, setFabricType] = useState("");
  const [embroideryStyle, setEmbroideryStyle] = useState("");
  const [tailoringDays, setTailoringDays] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Single mode flexible image list
  const [singleFiles, setSingleFiles] = useState<File[]>([]);

  function updateOutfitOption(index: number, patch: Partial<OutfitOptionDraft>) {
    setOutfitOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option)));
  }

  function updateProductionMaterial(id: string, patch: Partial<ProductionMaterialDraft>) {
    setProductionMaterials((current) =>
      current.map((material) => (material.id === id ? { ...material, ...patch } : material)),
    );
  }

  function addProductionMaterial() {
    setProductionMaterials((current) => [
      ...current,
      {
        ...initialProductionMaterials()[0],
        id: Math.random().toString(36).slice(2, 9),
      },
    ]);
  }

  function removeProductionMaterial(id: string) {
    setProductionMaterials((current) =>
      current.length === 1 ? current : current.filter((material) => material.id !== id),
    );
  }

  function serializeProductionMaterials(materials: ProductionMaterialDraft[]) {
    return materials
      .filter((material) => material.name.trim())
      .map((material) => ({
        id: material.id,
        name: material.name.trim(),
        optionKey: material.optionKey === "all" ? undefined : material.optionKey,
        unit: material.unit,
        requiredQty: Number(material.requiredQty || 0),
        availableQty: Number(material.availableQty || 0),
        lowStockLevel: Number(material.lowStockLevel || 0),
        note: material.note.trim() || undefined,
      }));
  }

  function buildFamilyRoles(base: {
    price: string;
    designerCostUsd: string;
    taxPercent: string;
    otherCostUsd: string;
    options: OutfitOptionDraft[];
  }) {
    return [
      {
        label: "Women Outfit",
        price: Number(base.price),
        gender: "female",
        customerType: "woman",
        outfitOption: "standard",
        description: "Complete traditional outfit",
        designerCostUsd: Number(base.designerCostUsd),
        taxPercent: Number(base.taxPercent),
        otherCostUsd: Number(base.otherCostUsd),
      },
      ...base.options.map((option) => ({
        label: option.label,
        price: Number(option.price),
        gender: option.gender,
        customerType: option.customerType,
        outfitOption: option.outfitOption,
        description: option.description,
        designerCostUsd: Number(option.designerCostUsd),
        taxPercent: Number(option.taxPercent),
        otherCostUsd: Number(option.otherCostUsd),
      })),
    ];
  }

  function renderOptionInputs(option: OutfitOptionDraft, index: number) {
    const price = Number(option.price || 0) || 0;
    const cost =
      (Number(option.designerCostUsd || 0) || 0) +
      price * ((Number(option.taxPercent || 0) || 0) / 100) +
      (Number(option.otherCostUsd || 0) || 0);
    return (
      <div key={`${option.customerType}-${option.outfitOption}`} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black text-slate-900">{option.label.replace("Men - ", "").replace("Boy - ", "")}</p>
            <p className="text-[10px] font-semibold text-slate-500">{option.description}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-800">
            Est. cost ${cost.toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ["Selling Price", "price"],
            ["Production Cost", "designerCostUsd"],
            ["Tax %", "taxPercent"],
            ["Other Cost", "otherCostUsd"],
          ].map(([label, key]) => (
            <label key={key}>
              <span className="mb-1 block text-[9px] font-black uppercase text-slate-400">{label}</span>
              <input
                type="number"
                value={String(option[key as keyof OutfitOptionDraft] ?? "")}
                onChange={(e) => updateOutfitOption(index, { [key]: e.target.value } as Partial<OutfitOptionDraft>)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-black outline-none focus:border-blue-500"
                placeholder="0.00"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  const sectionOptions = useMemo(
    () =>
      homepageSections.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [homepageSections],
  );
  const sectionNames = sectionOptions.map((section) => section.name);

  const getSubsectionsForSection = useCallback(
    (sectionName: string) => {
      const section = sectionOptions.find((item) => item.name === sectionName);
      return (section?.collections ?? section?.subsections ?? [])
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        )
        .map((subsection) => subsection.name);
    },
    [sectionOptions],
  );

  const sectionRequiresSubcategory = useCallback(
    (sectionName: string) => getSubsectionsForSection(sectionName).length > 0,
    [getSubsectionsForSection],
  );

  const subsections = getSubsectionsForSection(region);

  useEffect(() => {
    const firstSection = sectionOptions[0]?.name;
    if (!firstSection) return;
    if (!sectionOptions.some((section) => section.name === region)) {
      const firstSubsection = getSubsectionsForSection(firstSection)[0] ?? "";
      setRegion(firstSection);
      setSubcategory(firstSubsection);
    }
  }, [getSubsectionsForSection, region, sectionOptions]);

  useEffect(() => {
    const nextSubsections = getSubsectionsForSection(region);
    if (nextSubsections.length && !nextSubsections.includes(subcategory)) {
      setSubcategory(nextSubsections[0]);
    } else if (!nextSubsections.length && subcategory) {
      setSubcategory("");
    }
  }, [getSubsectionsForSection, region, subcategory, sectionOptions]);

  // --- Multiple Products State ---
  const [defaultRegion, setDefaultRegion] = useState(REGIONS[0]);
  const [defaultSubcategory, setDefaultSubcategory] = useState(
    TAXONOMY[REGIONS[0]]?.[0] || "",
  );
  const [defaultPrice, setDefaultPrice] = useState("120");
  const [defaultMiddleText, setDefaultMiddleText] = useState("");
  const [defaultDesignerCost, setDefaultDesignerCost] = useState("0");
  const [defaultTaxPercent, setDefaultTaxPercent] = useState("0");
  const [defaultOtherCost, setDefaultOtherCost] = useState("0");
  const [defaultGender, setDefaultGender] = useState("unisex");
  const [defaultFabric, setDefaultFabric] = useState("Pure Cotton");
  const [defaultEmbroidery, setDefaultEmbroidery] =
    useState("Traditional Tilet");
  const [defaultTailoringDays, setDefaultTailoringDays] = useState("30");
  const [defaultFeatured, setDefaultFeatured] = useState(false);
  const [defaultActive, setDefaultActive] = useState(true);

  useEffect(() => {
    const firstSection = sectionOptions[0]?.name;
    if (!firstSection) return;
    if (!sectionOptions.some((section) => section.name === defaultRegion)) {
      setDefaultRegion(firstSection);
      setDefaultSubcategory(getSubsectionsForSection(firstSection)[0] ?? "");
      return;
    }
    const nextSubsections = getSubsectionsForSection(defaultRegion);
    if (
      nextSubsections.length &&
      !nextSubsections.includes(defaultSubcategory)
    ) {
      setDefaultSubcategory(nextSubsections[0]);
    } else if (!nextSubsections.length && defaultSubcategory) {
      setDefaultSubcategory("");
    }
  }, [
    defaultRegion,
    defaultSubcategory,
    getSubsectionsForSection,
    sectionOptions,
  ]);

  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // S3 image upload helper
  async function uploadOneImage(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Each image must be 10MB or smaller");
    }

    return uploadFileToS3(file, "products");
  }

  // --- Handle Single Product Create ---
  async function handleSingleCreate() {
    // 1. Validations
    if (!region || (sectionRequiresSubcategory(region) && !subcategory)) {
      setFormNotice({
        tone: "error",
        title: "Missing Classification",
        message: "Please select the required catalog section before inserting a product.",
      });
      return;
    }
    if (!middleText.trim()) {
      setFormNotice({
        tone: "error",
        title: "Missing Data",
        message: "Please enter product name middle text.",
      });
      return;
    }
    if (!priceUsd) {
      setFormNotice({
        tone: "error",
        title: "Missing Data",
        message: "Please enter a base price.",
      });
      return;
    }
    if (designerCostUsd === "" || taxPercent === "" || otherCostUsd === "") {
      setFormNotice({
        tone: "error",
        title: "Missing Production Cost",
        message:
          "Designer labor cost, tax rate, and other production costs are mandatory.",
      });
      return;
    }
    const incompleteOption = outfitOptions.find(
      (option) =>
        !option.price ||
        option.designerCostUsd === "" ||
        option.taxPercent === "" ||
        option.otherCostUsd === "",
    );
    if (incompleteOption) {
      setFormNotice({
        tone: "error",
        title: "Missing Option Pricing",
        message: `${incompleteOption.label} needs selling price, production cost, tax, and other cost.`,
      });
      return;
    }
    const uploadedFiles = singleFiles.filter((file) =>
      file.type.startsWith("image/"),
    );
    if (uploadedFiles.length < 1) {
      setFormNotice({
        tone: "error",
        title: "Missing Images",
        message: "Please upload at least one product image.",
      });
      return;
    }

    setBusy(true);
    setFormNotice(null);

    try {
      // 2. Upload images to S3
      const imageUrls: string[] = [];
      for (const file of uploadedFiles) {
        const url = await uploadOneImage(file);
        imageUrls.push(url);
      }

      // 3. Generate Name
      const nextNum = getNextIncrementNumber(region, subcategory);
      const uniqueId = buildProductUniqueId(region, subcategory, nextNum);
      const generatedName = buildProductName(region, subcategory, middleText, uniqueId);

      // 4. Create Product
      const payload = {
        name: generatedName,
        description: description.trim() || undefined,
        region,
        subcategory: subcategory || undefined,
        priceUsd: Number(priceUsd),
        groomPriceUsd: null,
        familyRoles: buildFamilyRoles({
          price: priceUsd,
          designerCostUsd,
          taxPercent,
          otherCostUsd,
          options: outfitOptions,
        }),
        productionMaterials: serializeProductionMaterials(productionMaterials),
        designerCostUsd: Number(designerCostUsd),
        taxPercent: Number(taxPercent),
        otherCostUsd: Number(otherCostUsd),
        gender,
        fabricType: fabricType || undefined,
        embroideryStyle: embroideryStyle || undefined,
        tailoringDays: Number(tailoringDays) || 30,
        isActive,
        isFeatured,
        images: imageUrls,
        uniqueId,
      };

      const res = await fetch("/api/backend/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to create product");
      }

      setFormNotice({
        tone: "success",
        title: "Success",
        message: "Product added to catalog successfully",
      });
      setTimeout(() => router.push("/admin/inventory"), 1000);
    } catch (error: unknown) {
      setFormNotice({
        tone: "error",
        title: "Error",
        message: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  // File helpers
  function addSingleFiles(files: FileList | null) {
    const images = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!images.length) return;
    setSingleFiles((prev) => [...prev, ...images]);
  }

  function removeSingleFile(index: number) {
    setSingleFiles((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  // --- Handle Bulk Folder Select ---
  function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files || []);
    const imgFiles = fileList.filter((file) => file.type.startsWith("image/"));
    e.currentTarget.value = "";

    // Group files by parent folder name
    const groups: Record<string, File[]> = {};
    imgFiles.forEach((file) => {
      const parts = file.webkitRelativePath.split("/");
      if (parts.length >= 2) {
        const folderName = parts[parts.length - 2]; // get the direct parent folder name
        if (!groups[folderName]) groups[folderName] = [];
        groups[folderName].push(file);
      }
    });

    // Map to bulk product format
    const parsed: BulkProduct[] = Object.keys(groups).map((folderName) => {
      // Beautify folder name for default middle text
      const cleanName = folderName
        .replace(/[-_]+/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      return {
        id: Math.random().toString(36).substring(2, 9),
        folderName,
        middleText: defaultMiddleText.trim() || cleanName || "Traditional Dress",
        files: groups[folderName],
        priceUsd: defaultPrice,
        designerCostUsd: defaultDesignerCost,
        taxPercent: defaultTaxPercent,
        otherCostUsd: defaultOtherCost,
        outfitOptions: initialOptionPricing().map((option) => ({
          ...option,
          price: defaultPrice,
          designerCostUsd: defaultDesignerCost,
          taxPercent: defaultTaxPercent,
          otherCostUsd: defaultOtherCost,
        })),
        productionMaterials: initialProductionMaterials(),
        pricingOpen: false,
        region: defaultRegion,
        subcategory: defaultSubcategory,
        gender: defaultGender,
        fabricType: defaultFabric,
        embroideryStyle: defaultEmbroidery,
        tailoringDays: defaultTailoringDays,
        isFeatured: defaultFeatured,
        isActive: defaultActive,
        import: true,
        status: "pending",
      };
    });

    setBulkProducts(parsed);
    setFormNotice(null);

    // SweetAlert success notification for discovered folders
    if (parsed.length > 0) {
      void dashboardSuccess(
        "Folders Discovered",
        `Found ${parsed.length} product folder${parsed.length === 1 ? "" : "s"} with images ready for import.`,
      );
    }
  }

  async function handleRootDirectoryClick() {
    const confirmed = await dashboardConfirm({
      title: "Select Root Directory?",
      text: "Choose one parent folder. Every subfolder with images will be prepared as a product. Your browser may ask for folder upload permission next.",
      confirmButtonText: "Yes, Select Folder",
      cancelButtonText: "Cancel",
      tone: "success",
      icon: "question",
    });
    if (!confirmed) return;
    folderInputRef.current?.click();
  }

  // Update a single property for an item in bulk list
  function updateBulkProduct(
    id: string,
    key: keyof BulkProduct,
    value: BulkProduct[keyof BulkProduct],
  ) {
    setBulkProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [key]: value } as BulkProduct;
        // Keep subcategory in sync with region if region changes
        if (key === "region") {
          updated.subcategory =
            getSubsectionsForSection(String(value))?.[0] || "";
        }
        return updated;
      }),
    );
  }

  function updateBulkOutfitOption(productId: string, optionIndex: number, patch: Partial<OutfitOptionDraft>) {
    setBulkProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              outfitOptions: product.outfitOptions.map((option, index) =>
                index === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : product,
      ),
    );
  }

  // --- Execute Bulk Folder Import ---
  async function handleBulkImport() {
    const activeProducts = bulkProducts.filter((p) => p.import);
    if (activeProducts.length === 0) {
      void dashboardError(
        "No Items Selected",
        "Please check at least one product folder to import.",
      );
      return;
    }

    const invalid = activeProducts.find(
      (p) =>
        !p.middleText.trim() ||
        !p.priceUsd ||
        p.designerCostUsd === "" ||
        p.taxPercent === "" ||
        p.otherCostUsd === "" ||
        p.outfitOptions.some(
          (option) =>
            !option.price ||
            option.designerCostUsd === "" ||
            option.taxPercent === "" ||
            option.otherCostUsd === "",
        ) ||
        p.files.length < 1,
    );
    if (invalid) {
      void dashboardError(
        "Invalid Data",
        `Product "${invalid.folderName}" needs a middle name, a price, production cost values, and at least one image.`,
      );
      return;
    }
    const missingCollection = activeProducts.find(
      (p) => !p.region || (sectionRequiresSubcategory(p.region) && !p.subcategory),
    );
    if (missingCollection) {
      void dashboardError(
        "Missing Classification",
        `Product "${missingCollection.folderName}" needs the required catalog section before import.`,
      );
      return;
    }

    // SweetAlert confirmation before proceeding
    const confirmed = await dashboardConfirm({
      title: "Run Bulk Import?",
      text: `Are you sure you want to import ${activeProducts.length} product folder${activeProducts.length === 1 ? "" : "s"}? This will upload images and create catalog entries.`,
      confirmButtonText: "Yes, import all",
      cancelButtonText: "No, cancel",
      tone: "success",
      icon: "question",
    });
    if (!confirmed) return;

    setBusy(true);
    setBulkProgress({ current: 0, total: activeProducts.length });
    setFormNotice(null);

    // Keep track of counter offsets locally during the batch to avoid duplicates
    const localCounters: Record<string, number> = {};

    let successCount = 0;

    for (let i = 0; i < activeProducts.length; i++) {
      const prod = activeProducts[i];

      // Update status to uploading in UI
      setBulkProducts((prev) =>
        prev.map((item) =>
          item.id === prod.id ? { ...item, status: "uploading" } : item,
        ),
      );
      setBulkProgress({ current: i + 1, total: activeProducts.length });

      try {
        // 1. Upload every image in the product folder
        const urls: string[] = [];
        for (const file of prod.files) {
          const url = await uploadOneImage(file);
          urls.push(url);
        }

        // 2. Generate name with correct increment offset
        const key = `${prod.region}-${prod.subcategory || "none"}`;
        const offset = localCounters[key] || 0;
        const nextNum = getNextIncrementNumber(
          prod.region,
          prod.subcategory,
          offset,
        );
        localCounters[key] = offset + 1;

        const uniqueId = buildProductUniqueId(prod.region, prod.subcategory, nextNum);
        const generatedName = buildProductName(prod.region, prod.subcategory, prod.middleText, uniqueId);

        // 3. Post to backend
        const payload = {
          name: generatedName,
          description: `Folder Import: ${prod.folderName}. Cultural garment representing ${prod.region} craftsmanship.`,
          region: prod.region,
          subcategory: prod.subcategory || undefined,
          priceUsd: Number(prod.priceUsd),
          groomPriceUsd: null,
          familyRoles: buildFamilyRoles({
            price: prod.priceUsd,
            designerCostUsd: prod.designerCostUsd,
            taxPercent: prod.taxPercent,
            otherCostUsd: prod.otherCostUsd,
            options: prod.outfitOptions,
          }),
          productionMaterials: serializeProductionMaterials(prod.productionMaterials),
          designerCostUsd: Number(prod.designerCostUsd),
          taxPercent: Number(prod.taxPercent),
          otherCostUsd: Number(prod.otherCostUsd),
          gender: prod.gender,
          fabricType: prod.fabricType || undefined,
          embroideryStyle: prod.embroideryStyle || undefined,
          tailoringDays: Number(prod.tailoringDays) || 30,
          isActive: prod.isActive,
          isFeatured: prod.isFeatured,
          images: urls,
          uniqueId,
        };

        const res = await fetch("/api/backend/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Insert failed");
        }

        successCount++;
        setBulkProducts((prev) =>
          prev.map((item) =>
            item.id === prod.id ? { ...item, status: "success" } : item,
          ),
        );
      } catch (error: unknown) {
        console.error("Failed to import product", prod.folderName, error);
        setBulkProducts((prev) =>
          prev.map((item) =>
            item.id === prod.id
              ? { ...item, status: "error", errorMsg: errorMessage(error) }
              : item,
          ),
        );
      }
    }

    setBusy(false);
    setBulkProgress(null);

    if (successCount === activeProducts.length) {
      void dashboardSuccess(
        "Import Complete",
        `Successfully imported all ${successCount} products!`,
      );
      setTimeout(() => router.push("/admin/inventory"), 1500);
    } else {
      void dashboardError(
        "Import Finished with Warnings",
        `Imported ${successCount} of ${activeProducts.length} successfully. Please check folders with errors.`,
      );
    }
  }

  // Sync default values to all pending bulk products
  function applyDefaultsToAll() {
    setBulkProducts((prev) =>
      prev.map((p) => {
        if (p.status !== "pending") return p;
        return {
          ...p,
          region: defaultRegion,
          subcategory: getSubsectionsForSection(defaultRegion).includes(
            p.subcategory,
          )
            ? p.subcategory
            : getSubsectionsForSection(defaultRegion)[0] || "",
          priceUsd: defaultPrice,
          outfitOptions: p.outfitOptions.map((option) => ({
            ...option,
            price: defaultPrice,
            designerCostUsd: defaultDesignerCost,
            taxPercent: defaultTaxPercent,
            otherCostUsd: defaultOtherCost,
          })),
          middleText: defaultMiddleText.trim() || p.middleText,
          designerCostUsd: defaultDesignerCost,
          taxPercent: defaultTaxPercent,
          otherCostUsd: defaultOtherCost,
          gender: defaultGender,
          fabricType: defaultFabric,
          embroideryStyle: defaultEmbroidery,
          tailoringDays: defaultTailoringDays,
          isFeatured: defaultFeatured,
          isActive: defaultActive,
        };
      }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
      <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl border-l-4 border-l-emerald-600">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm font-black text-2xl">
              <Package className="h-10 w-10" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                Catalog Management
              </p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">
                Add New Outfit
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Register products in either Single or Bulk directory mode.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              Discard
            </button>
            {uploadMode === "single" ? (
              <button
                onClick={handleSingleCreate}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}{" "}
                Create Product
              </button>
            ) : (
              <button
                onClick={handleBulkImport}
                disabled={busy || bulkProducts.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}{" "}
                Run Bulk Import
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mode Toggle Tabs */}
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => {
            if (!busy) setUploadMode("single");
          }}
          disabled={busy}
          className={cn(
            "flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all",
            uploadMode === "single"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          Single Product Mode
        </button>
        <button
          onClick={() => {
            if (!busy) setUploadMode("multiple");
          }}
          disabled={busy}
          className={cn(
            "flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all",
            uploadMode === "multiple"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          Multiple Products Mode (Bulk Folder)
        </button>
      </div>

      {formNotice && (
        <div
          className={cn(
            "flex items-center gap-4 rounded-[2rem] p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300",
            formNotice.tone === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white",
          )}
        >
          {formNotice.tone === "success" ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
          <div>
            <p className="font-black uppercase tracking-tight text-xl">
              {formNotice.title}
            </p>
            <p className="font-bold opacity-90">{formNotice.message}</p>
          </div>
        </div>
      )}

      {bulkProgress && (
        <div className="rounded-[2rem] bg-emerald-50 border border-emerald-200 p-6 text-emerald-800 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm uppercase tracking-wider">
              Bulk Import Progress
            </span>
            <span className="font-black">
              {bulkProgress.current} / {bulkProgress.total}
            </span>
          </div>
          <div className="h-3 w-full bg-emerald-200/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {uploadMode === "single" ? (
        // ================= SINGLE PRODUCT MODE =================
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-300">
          <main className="lg:col-span-8 space-y-6">
            {/* Section 1: Dynamic Name Generator */}
            <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                  <Info className="h-4 w-4" /> Identity & Name Generator
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Tribe
                    </label>
                    <select
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        setSubcategory(
                          getSubsectionsForSection(e.target.value)?.[0] || "",
                        );
                      }}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                    >
                      {sectionNames.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Region
                    </label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                      disabled={!subsections.length}
                    >
                      {!subsections.length ? (
                        <option value="">No region required</option>
                      ) : null}
                      {subsections.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Customize Middle Title{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center font-bold text-slate-900 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                    <span className="bg-slate-100 px-4 py-3.5 border-r border-slate-200 select-none text-slate-500 text-sm">
                      {[region, subcategory].filter(Boolean).join(" ")}
                    </span>
                    <input
                      value={middleText}
                      onChange={(e) => setMiddleText(e.target.value)}
                      placeholder="e.g. Traditional Family Outfit"
                      className="flex-1 px-4 py-3 outline-none text-sm font-bold min-w-[200px]"
                    />
                    <span className="bg-slate-100 px-4 py-3.5 border-l border-slate-200 select-none text-slate-500 text-sm font-mono tracking-wider">
                      - {buildProductUniqueId(region, subcategory, getNextIncrementNumber(region, subcategory))}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Live Catalog Preview:{" "}
                    <span className="text-emerald-700 font-mono font-black select-all ml-1">
                      {buildProductName(
                        region,
                        subcategory,
                        middleText,
                        buildProductUniqueId(region, subcategory, getNextIncrementNumber(region, subcategory)),
                      )}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Detailed Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Background, cultural significance, and design details..."
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-6 font-bold outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Image Poses Slots */}
            <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                  <ImageIcon className="h-4 w-4" /> Product Images (Required)
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
                  <label className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/40">
                    <Upload className="mb-3 h-9 w-9 text-slate-300 transition-colors group-hover:text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Add Product Images
                    </span>
                    <span className="mt-2 max-w-[190px] text-xs font-bold leading-5 text-slate-400">
                      Upload one or many product photos. Every selected image
                      will be saved with this item.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addSingleFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <div
                    className={cn(
                      "grid min-h-[260px] gap-4 rounded-2xl border border-slate-100 bg-white p-4",
                      singleFiles.length
                        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                        : "place-items-center",
                    )}
                  >
                    {singleFiles.length ? (
                      singleFiles.map((file, idx) => {
                        const fileUrl = URL.createObjectURL(file);
                        return (
                          <div
                            key={`${file.name}-${idx}`}
                            className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                          >
                            <img
                              src={fileUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-2 text-[9px] font-black uppercase tracking-wider text-white">
                              Image {idx + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSingleFile(idx)}
                              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white shadow transition-colors hover:bg-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          No images selected
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-300">
                          At least one image is required.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Garment Specifications */}
            <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                  <Shirt className="h-4 w-4" /> Craftsmanship Details
                </h3>
              </div>
              <div className="p-8 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Garment Target Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Estimated Delivery Days{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={tailoringDays}
                    onChange={(e) => setTailoringDays(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Fabric Texture
                  </label>
                  <input
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value)}
                    placeholder="e.g. Pure Cotton, Handwoven Shemma"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Embroidery Style
                  </label>
                  <input
                    value={embroideryStyle}
                    onChange={(e) => setEmbroideryStyle(e.target.value)}
                    placeholder="e.g. Traditional Tilet, Cross-stitch"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  />
                </div>
              </div>
            </section>
          </main>

          <aside className="lg:col-span-4 space-y-6">
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <DollarSign className="h-4 w-4" /> Pricing Config
              </h3>
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-4">
                  <label className="mb-1 block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Base Price (USD) *
                  </label>
                  <input
                    type="number"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="w-full bg-transparent text-xl font-black outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Production Cost Setup *
                  </p>
                  <div className="grid gap-3">
                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                        Designer Labor Cost
                      </span>
                      <input
                        type="number"
                        value={designerCostUsd}
                        onChange={(e) => setDesignerCostUsd(e.target.value)}
                        className="h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm font-black outline-none"
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                        Production Tax Rate (%)
                      </span>
                      <input
                        type="number"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(e.target.value)}
                        className="h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm font-black outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                        Other Production Costs
                      </span>
                      <input
                        type="number"
                        value={otherCostUsd}
                        onChange={(e) => setOtherCostUsd(e.target.value)}
                        className="h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm font-black outline-none"
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs font-bold text-emerald-900">
                    Estimated unit production cost: $
                    {(
                      (Number(designerCostUsd) || 0) +
                      (Number(priceUsd) || 0) *
                        ((Number(taxPercent) || 0) / 100) +
                      (Number(otherCostUsd) || 0)
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-800">
                    Customer Option Pricing *
                  </p>
                  <p className="mb-4 text-[11px] font-bold leading-5 text-blue-900/70">
                    Men and Boy use three sub-options. Women and Girl use the standard outfit price.
                  </p>
                  <div className="space-y-3">
                    {CUSTOMER_GROUPS.map((group) => {
                      const groupOptions =
                        group.key === "woman"
                          ? []
                          : outfitOptions
                              .map((option, index) => ({ option, index }))
                              .filter(({ option }) => option.customerType === group.key);
                      const isOpen = openPricingGroups[group.key] ?? false;
                      return (
                        <div key={group.key} className="overflow-hidden rounded-xl border border-blue-100 bg-white">
                          <button
                            type="button"
                            onClick={() => setOpenPricingGroups((current) => ({ ...current, [group.key]: !isOpen }))}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <span className="text-xs font-black uppercase tracking-widest text-slate-800">{group.label}</span>
                            <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                          </button>
                          {isOpen ? (
                            <div className="space-y-3 border-t border-blue-50 bg-slate-50/60 p-3">
                              {group.key === "woman" ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-black text-slate-900">Women Outfit</p>
                                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Uses the base price and production cost fields above.
                                  </p>
                                </div>
                              ) : (
                                groupOptions.map(({ option, index }) => renderOptionInputs(option, index))
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setOpenMaterials((current) => !current)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Production Materials</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", openMaterials && "rotate-180")} />
                  </button>
                  {openMaterials ? (
                    <div className="mt-4 space-y-3">
                      {productionMaterials.map((material) => (
                        <div key={material.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input value={material.name} onChange={(e) => updateProductionMaterial(material.id, { name: e.target.value })} placeholder="Material name" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" />
                            <select value={material.optionKey} onChange={(e) => updateProductionMaterial(material.id, { optionKey: e.target.value })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none">
                              <option value="all">Shared for product</option>
                              <option value="woman:standard">Women</option>
                              {outfitOptions.map((option) => <option key={optionKey(option)} value={optionKey(option)}>{option.label}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                            <input type="number" value={material.requiredQty} onChange={(e) => updateProductionMaterial(material.id, { requiredQty: e.target.value })} placeholder="Required" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" />
                            <input type="number" value={material.availableQty} onChange={(e) => updateProductionMaterial(material.id, { availableQty: e.target.value })} placeholder="Available" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" />
                            <input type="number" value={material.lowStockLevel} onChange={(e) => updateProductionMaterial(material.id, { lowStockLevel: e.target.value })} placeholder="Low stock level" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" />
                            <select value={material.unit} onChange={(e) => updateProductionMaterial(material.id, { unit: e.target.value as ProductionMaterialDraft["unit"] })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none">
                              {MATERIAL_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <input value={material.note} onChange={(e) => updateProductionMaterial(material.id, { note: e.target.value })} placeholder="Designer note" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold outline-none" />
                            <button type="button" onClick={() => removeProductionMaterial(material.id)} className="h-10 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700">Remove</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addProductionMaterial} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-800">
                        <Plus className="h-4 w-4" /> Add Material
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <ShieldCheck className="h-4 w-4" /> Storefront Controls
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">
                      Featured Product
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Home page hero boost
                    </p>
                  </div>
                  <button
                    onClick={() => setIsFeatured(!isFeatured)}
                    className={cn(
                      "relative inline-flex h-6 w-11 rounded-full p-1 transition-all",
                      isFeatured ? "bg-amber-500" : "bg-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full bg-white transition-all",
                        isFeatured ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">
                      Publicly Active
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Visible for customers
                    </p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      "relative inline-flex h-6 w-11 rounded-full p-1 transition-all",
                      isActive ? "bg-emerald-500" : "bg-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full bg-white transition-all",
                        isActive ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      ) : (
        // ================= MULTIPLE PRODUCTS BULK MODE =================
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Config Defaults Panel */}
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
              <FolderOpen className="h-4 w-4" /> Step 1: Product Defaults for
              Bulk Import
            </h3>
            <p className="mb-6 text-xs font-bold leading-5 text-slate-500">
              These defaults are applied to every detected folder, matching the
              single-product fields for classification, selling price,
              production cost, garment details, and storefront status.
            </p>
            <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Tribe
                </label>
                <select
                  value={defaultRegion}
                  onChange={(e) => {
                    setDefaultRegion(e.target.value);
                    setDefaultSubcategory(
                      getSubsectionsForSection(e.target.value)?.[0] || "",
                    );
                  }}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                >
                  {sectionNames.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Region
                </label>
                <select
                  value={defaultSubcategory}
                  onChange={(e) => setDefaultSubcategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                  disabled={!getSubsectionsForSection(defaultRegion).length}
                >
                  {!getSubsectionsForSection(defaultRegion).length ? (
                    <option value="">No region required</option>
                  ) : null}
                  {getSubsectionsForSection(defaultRegion).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Common Suffix
                </label>
                <input
                  value={defaultMiddleText}
                  onChange={(e) => setDefaultMiddleText(e.target.value)}
                  placeholder="Use folder name if blank"
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Price (USD)
                </label>
                <input
                  type="number"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Designer Cost
                </label>
                <input
                  type="number"
                  value={defaultDesignerCost}
                  onChange={(e) => setDefaultDesignerCost(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={defaultTaxPercent}
                  onChange={(e) => setDefaultTaxPercent(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Other Costs
                </label>
                <input
                  type="number"
                  value={defaultOtherCost}
                  onChange={(e) => setDefaultOtherCost(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Gender
                </label>
                <select
                  value={defaultGender}
                  onChange={(e) => setDefaultGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Fabric Type
                </label>
                <input
                  value={defaultFabric}
                  onChange={(e) => setDefaultFabric(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Embroidery Style
                </label>
                <input
                  value={defaultEmbroidery}
                  onChange={(e) => setDefaultEmbroidery(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Estimated Delivery Days
                </label>
                <input
                  type="number"
                  value={defaultTailoringDays}
                  onChange={(e) => setDefaultTailoringDays(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-8 mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Featured (Hero Boost)
                </span>
                <button
                  onClick={() => setDefaultFeatured(!defaultFeatured)}
                  className={cn(
                    "relative inline-flex h-5 w-10 rounded-full p-0.5 transition-all",
                    defaultFeatured ? "bg-amber-500" : "bg-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-all",
                      defaultFeatured ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Active (Public View)
                </span>
                <button
                  onClick={() => setDefaultActive(!defaultActive)}
                  className={cn(
                    "relative inline-flex h-5 w-10 rounded-full p-0.5 transition-all",
                    defaultActive ? "bg-emerald-500" : "bg-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-all",
                      defaultActive ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
              <button
                onClick={applyDefaultsToAll}
                className="ml-auto rounded-xl border border-emerald-600 hover:bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 transition-colors"
              >
                Apply Default Config to Loaded Folders
              </button>
            </div>
          </section>

          {/* Folder Upload Input Section */}
          <section className="rounded-[2.5rem] border-2 border-dashed border-slate-300 bg-white p-8 flex flex-col items-center justify-center text-center hover:border-emerald-600 transition-all group">
            <Upload className="h-12 w-12 text-slate-300 mb-3 group-hover:text-emerald-600 transition-colors" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Upload Root Folder
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Select one root folder. Each subfolder becomes a product, and
              every image inside that subfolder is attached to the catalog item.
            </p>
            <button
              type="button"
              onClick={() => void handleRootDirectoryClick()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800"
            >
              <FolderOpen className="h-4 w-4" /> Select Root Directory
            </button>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is supported by Chromium for folder import.
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
          </section>

          {/* Grouped Folders Listing Table */}
          {bulkProducts.length > 0 && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                  <Shirt className="h-4 w-4" /> Step 2: Configure & Verify
                  Detected Product Folders
                </h3>
                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
                  Total Items: {bulkProducts.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-200 text-left text-xs text-slate-800 bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-12">
                        Import
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-40">
                        Subfolder Name
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">
                        Images Previews
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest">
                        Tribe / Region
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest">
                        Custom Middle Name
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-24">
                        Price (USD)
                      </th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-28">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {bulkProducts.map((prod) => {
                      const subsections = getSubsectionsForSection(prod.region);
                      return (
                        <>
                        <tr
                          key={prod.id}
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            !prod.import && "opacity-50",
                          )}
                        >
                          <td className="px-6 py-6">
                            <input
                              type="checkbox"
                              checked={prod.import}
                              disabled={busy}
                              onChange={(e) =>
                                updateBulkProduct(
                                  prod.id,
                                  "import",
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-6 select-all">
                            <span
                              className="font-mono text-slate-900 block truncate max-w-[150px]"
                              title={prod.folderName}
                            >
                              {prod.folderName}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex gap-2 flex-wrap items-center">
                              {prod.files.map((file, i) => {
                                const fileUrl = URL.createObjectURL(file);
                                return (
                                  <div
                                    key={i}
                                    onClick={() => {
                                      setPreviewImage({
                                        name: `${prod.folderName} - Pose ${i + 1} (${file.name})`,
                                        url: fileUrl,
                                      });
                                    }}
                                    className="relative h-20 w-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 cursor-zoom-in hover:scale-105 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                                    title="Click to cross-check image"
                                  >
                                    <img
                                      src={fileUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-wider opacity-0 hover:opacity-100 transition-opacity">
                                      View
                                    </div>
                                  </div>
                                );
                              })}
                              {prod.files.length < 1 && (
                                <div className="text-[10px] text-rose-600 font-bold flex items-center bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 shrink-0 max-w-[150px] leading-tight">
                                  Error: Add at least 1 image
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6 space-y-1">
                            <select
                              value={prod.region}
                              disabled={busy}
                              onChange={(e) =>
                                updateBulkProduct(
                                  prod.id,
                                  "region",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none"
                            >
                              {sectionNames.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <select
                              value={prod.subcategory}
                              disabled={busy || !subsections.length}
                              onChange={(e) =>
                                updateBulkProduct(
                                  prod.id,
                                  "subcategory",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none"
                            >
                              {!subsections.length ? (
                                <option value="">No region required</option>
                              ) : null}
                              {subsections.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <input
                                value={prod.middleText}
                                disabled={busy}
                                onChange={(e) =>
                                  updateBulkProduct(
                                    prod.id,
                                    "middleText",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none font-bold"
                              />
                              <p className="text-[9px] text-slate-400 select-all font-mono">
                                suffix: - {buildProductUniqueId(prod.region, prod.subcategory, "...")}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={prod.priceUsd}
                                disabled={busy}
                                onChange={(e) =>
                                  updateBulkProduct(
                                    prod.id,
                                    "priceUsd",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none font-bold"
                                placeholder="0.00"
                              />
                              <button
                                type="button"
                                onClick={() => updateBulkProduct(prod.id, "pricingOpen", !prod.pricingOpen)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-800"
                              >
                                <ChevronDown className={cn("h-3 w-3 transition-transform", prod.pricingOpen && "rotate-180")} />
                                Pricing
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                                prod.status === "pending" &&
                                  "bg-slate-100 text-slate-500",
                                prod.status === "uploading" &&
                                  "bg-blue-100 text-blue-700 animate-pulse",
                                prod.status === "success" &&
                                  "bg-emerald-100 text-emerald-700",
                                prod.status === "error" &&
                                  "bg-rose-100 text-rose-700",
                              )}
                            >
                              {prod.status}
                            </span>
                            {prod.errorMsg && (
                              <span
                                className="block text-[8px] text-rose-500 font-normal leading-tight mt-1 max-w-[120px] truncate"
                                title={prod.errorMsg}
                              >
                                {prod.errorMsg}
                              </span>
                            )}
                          </td>
                        </tr>
                        {prod.pricingOpen ? (
                          <tr className="bg-blue-50/30">
                            <td colSpan={7} className="px-6 py-5">
                              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">Option Pricing</p>
                                    <p className="mt-1 text-[11px] font-semibold text-slate-500">Women uses the base row price. Men and Boy have three sub-options.</p>
                                  </div>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-2">
                                  {CUSTOMER_GROUPS.map((group) => {
                                    const options = prod.outfitOptions
                                      .map((option, index) => ({ option, index }))
                                      .filter(({ option }) => option.customerType === group.key);
                                    return (
                                      <div key={group.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{group.label}</p>
                                        {group.key === "woman" ? (
                                          <p className="rounded-lg bg-white p-3 text-[11px] font-bold text-slate-600">Uses base price ${Number(prod.priceUsd || 0).toFixed(2)}.</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {options.map(({ option, index }) => (
                                              <div key={`${prod.id}-${optionKey(option)}`} className="rounded-lg bg-white p-3">
                                                <p className="mb-2 text-[11px] font-black text-slate-900">{option.label}</p>
                                                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                                  {[
                                                    ["Price", "price"],
                                                    ["Cost", "designerCostUsd"],
                                                    ["Tax", "taxPercent"],
                                                    ["Other", "otherCostUsd"],
                                                  ].map(([label, key]) => (
                                                    <label key={key}>
                                                      <span className="mb-1 block text-[8px] font-black uppercase text-slate-400">{label}</span>
                                                      <input
                                                        type="number"
                                                        value={String(option[key as keyof OutfitOptionDraft] ?? "")}
                                                        onChange={(e) => updateBulkOutfitOption(prod.id, index, { [key]: e.target.value } as Partial<OutfitOptionDraft>)}
                                                        className="h-9 w-full rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-black outline-none"
                                                      />
                                                    </label>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Large Image Crosscheck Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col items-center">
            <button
              onClick={() => {
                URL.revokeObjectURL(previewImage.url);
                setPreviewImage(null);
              }}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 truncate max-w-lg">
              Cross-Check Image: {previewImage.name}
            </h3>
            <div className="w-full aspect-[3/4] max-h-[60vh] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Verify pose, quality, and details before importing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
