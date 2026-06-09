"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2,
  Package,
  Plus,
  Trash2,
  Star,
  DollarSign,
  Clock,
  Shirt,
  Info,
  ShieldCheck,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  FolderOpen,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardConfirm, dashboardSuccess, dashboardError } from "@/lib/dashboard-swal";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

type BulkProduct = {
  id: string;
  folderName: string;
  middleText: string;
  files: File[];
  priceUsd: string;
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

// Region & Subcategory Abbreviation Helpers
function getRegionCode(r: string): string {
  const map: Record<string, string> = {
    "Amhara": "AMH",
    "Oromo": "ORO",
    "Tigre": "TIG",
    "Debub": "DEB",
    "Islamic": "ISL",
    "Men": "MEN",
    "Bride & Groom": "BDG",
    "Mila's Choice": "MIL"
  };
  return map[r] || r.slice(0, 3).toUpperCase();
}

function getSubcategoryCode(sub: string): string {
  if (!sub) return "GEN";
  const map: Record<string, string> = {
    "Gondar": "GND",
    "Wollega": "WLG",
    "Shewa": "SHW",
    "Arsi": "ARS",
    "Jimma": "JIM",
    "Borena": "BOR",
    "Harar": "HAR",
    "Guji": "GUJ",
    "Kids": "KID",
    "Apparels": "APP",
    "Gojam": "GJM",
    "Wollo": "WLO",
    "Minjar": "MNJ",
    "Raya": "RAY",
    "Adigrat": "ADG",
    "Axum": "AXM",
    "Shire": "SHR",
    "Chiffon": "CHF",
    "Gurage": "GRG",
    "Welaita": "WLT",
    "Gamo": "GAM",
    "Sidama": "SID",
    "Modern": "MOD",
    "Amhara": "AMH",
    "Oromo": "ORO",
    "Tigre": "TIG",
    "Debub": "DEB"
  };
  return map[sub] || sub.slice(0, 3).toUpperCase();
}

export function ProductCreateClient() {
  const router = useRouter();
  const [uploadMode, setUploadMode] = useState<"single" | "multiple">("single");
  const [busy, setBusy] = useState(false);
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null);

  // Existing products list for increment counts
  const [existingProducts, setExistingProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/backend/admin/products?limit=200")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setExistingProducts(json.data);
        }
      })
      .catch(err => console.error("Error fetching existing products for auto-increment number", err));
  }, []);

  // Helper to compute increment number (handling local batch offsets)
  function getNextIncrementNumber(selectedRegion: string, selectedSub: string, offset = 0): string {
    const count = existingProducts.filter(p => 
      p.region?.toLowerCase() === selectedRegion.toLowerCase() && 
      (p.subcategory || "").toLowerCase() === (selectedSub || "").toLowerCase()
    ).length;
    return String(count + 1 + offset).padStart(3, "0");
  }

  // --- Single Product State ---
  const [region, setRegion] = useState(REGIONS[0]);
  const [subcategory, setSubcategory] = useState(TAXONOMY[REGIONS[0]]?.[0] || "");
  const [middleText, setMiddleText] = useState("Traditional Family Outfit");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [groomPriceUsd, setGroomPriceUsd] = useState("");
  const [gender, setGender] = useState("female");
  const [fabricType, setFabricType] = useState("");
  const [embroideryStyle, setEmbroideryStyle] = useState("");
  const [tailoringDays, setTailoringDays] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Single mode 4 file slots
  const [singleFiles, setSingleFiles] = useState<(File | null)[]>([null, null, null, null]);

  const subsections = TAXONOMY[region] ?? [];

  // --- Multiple Products State ---
  const [defaultRegion, setDefaultRegion] = useState(REGIONS[0]);
  const [defaultSubcategory, setDefaultSubcategory] = useState(TAXONOMY[REGIONS[0]]?.[0] || "");
  const [defaultPrice, setDefaultPrice] = useState("120");
  const [defaultGender, setDefaultGender] = useState("unisex");
  const [defaultFabric, setDefaultFabric] = useState("Pure Cotton");
  const [defaultEmbroidery, setDefaultEmbroidery] = useState("Traditional Tilet");
  const [defaultTailoringDays, setDefaultTailoringDays] = useState("30");
  const [defaultFeatured, setDefaultFeatured] = useState(false);
  const [defaultActive, setDefaultActive] = useState(true);

  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Cloudinary image upload helper
  async function uploadOneImage(file: File): Promise<string> {
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

  // --- Handle Single Product Create ---
  async function handleSingleCreate() {
    // 1. Validations
    if (!middleText.trim()) {
      setFormNotice({ tone: "error", title: "Missing Data", message: "Please enter product name middle text." });
      return;
    }
    if (!priceUsd) {
      setFormNotice({ tone: "error", title: "Missing Data", message: "Please enter a base price." });
      return;
    }
    const uploadedFiles = singleFiles.filter((f): f is File => f !== null);
    if (uploadedFiles.length !== 4) {
      setFormNotice({ tone: "error", title: "Missing Images", message: "Please upload exactly 4 images for different poses." });
      return;
    }

    setBusy(true);
    setFormNotice(null);

    try {
      // 2. Upload images to Cloudinary
      const imageUrls: string[] = [];
      for (const file of uploadedFiles) {
        const url = await uploadOneImage(file);
        imageUrls.push(url);
      }

      // 3. Generate Name
      const nextNum = getNextIncrementNumber(region, subcategory);
      const uniqueId = `${getRegionCode(region)}-${getSubcategoryCode(subcategory)}-${nextNum}`;
      const generatedName = `${region} ${subcategory} ${middleText.trim()} — ${uniqueId}`;

      // 4. Create Product
      const payload = {
        name: generatedName,
        description: description.trim() || undefined,
        region,
        subcategory: subcategory || undefined,
        priceUsd: Number(priceUsd),
        groomPriceUsd: groomPriceUsd ? Number(groomPriceUsd) : null,
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

      setFormNotice({ tone: "success", title: "Success", message: "Product added to catalog successfully" });
      setTimeout(() => router.push("/admin/inventory"), 1000);
    } catch (error: any) {
      setFormNotice({ tone: "error", title: "Error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  // File slot helpers
  function handleSingleFileChange(index: number, file: File | null) {
    const updated = [...singleFiles];
    updated[index] = file;
    setSingleFiles(updated);
  }

  // --- Handle Bulk Folder Select ---
  function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files || []);
    const imgFiles = fileList.filter(file => file.type.startsWith("image/"));

    // Group files by parent folder name
    const groups: Record<string, File[]> = {};
    imgFiles.forEach(file => {
      const parts = file.webkitRelativePath.split("/");
      if (parts.length >= 2) {
        const folderName = parts[parts.length - 2]; // get the direct parent folder name
        if (!groups[folderName]) groups[folderName] = [];
        groups[folderName].push(file);
      }
    });

    // Map to bulk product format
    const parsed: BulkProduct[] = Object.keys(groups).map(folderName => {
      // Beautify folder name for default middle text
      const cleanName = folderName
        .replace(/[-_]+/g, " ")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      return {
        id: Math.random().toString(36).substring(2, 9),
        folderName,
        middleText: cleanName || "Traditional Dress",
        files: groups[folderName].slice(0, 4), // take at most 4 images
        priceUsd: defaultPrice,
        region: defaultRegion,
        subcategory: defaultSubcategory,
        gender: defaultGender,
        fabricType: defaultFabric,
        embroideryStyle: defaultEmbroidery,
        tailoringDays: defaultTailoringDays,
        isFeatured: defaultFeatured,
        isActive: defaultActive,
        import: true,
        status: "pending"
      };
    });

    setBulkProducts(parsed);
    setFormNotice(null);

    // SweetAlert success notification for discovered folders
    if (parsed.length > 0) {
      void dashboardSuccess(
        "Folders Discovered",
        `Found ${parsed.length} product folder${parsed.length === 1 ? "" : "s"} with images ready for import.`
      );
    }
  }

  // Update a single property for an item in bulk list
  function updateBulkProduct(id: string, key: keyof BulkProduct, value: any) {
    setBulkProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [key]: value };
      // Keep subcategory in sync with region if region changes
      if (key === "region") {
        updated.subcategory = TAXONOMY[value]?.[0] || "";
      }
      return updated;
    }));
  }

  // --- Execute Bulk Folder Import ---
  async function handleBulkImport() {
    const activeProducts = bulkProducts.filter(p => p.import);
    if (activeProducts.length === 0) {
      void dashboardError("No Items Selected", "Please check at least one product folder to import.");
      return;
    }

    const invalid = activeProducts.find(p => !p.middleText.trim() || !p.priceUsd || p.files.length !== 4);
    if (invalid) {
      void dashboardError(
        "Invalid Data",
        `Product "${invalid.folderName}" needs a middle name, a price, and exactly 4 images (detected ${invalid.files.length}).`
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
      setBulkProducts(prev => prev.map(item => item.id === prod.id ? { ...item, status: "uploading" } : item));
      setBulkProgress({ current: i + 1, total: activeProducts.length });

      try {
        // 1. Upload the 4 files
        const urls: string[] = [];
        for (const file of prod.files) {
          const url = await uploadOneImage(file);
          urls.push(url);
        }

        // 2. Generate name with correct increment offset
        const key = `${prod.region}-${prod.subcategory}`;
        const offset = localCounters[key] || 0;
        const nextNum = getNextIncrementNumber(prod.region, prod.subcategory, offset);
        localCounters[key] = offset + 1;

        const uniqueId = `${getRegionCode(prod.region)}-${getSubcategoryCode(prod.subcategory)}-${nextNum}`;
        const generatedName = `${prod.region} ${prod.subcategory} ${prod.middleText.trim()} — ${uniqueId}`;

        // 3. Post to backend
        const payload = {
          name: generatedName,
          description: `Folder Import: ${prod.folderName}. Cultural garment representing ${prod.region} craftsmanship.`,
          region: prod.region,
          subcategory: prod.subcategory || undefined,
          priceUsd: Number(prod.priceUsd),
          groomPriceUsd: null,
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
        setBulkProducts(prev => prev.map(item => item.id === prod.id ? { ...item, status: "success" } : item));
      } catch (error: any) {
        console.error("Failed to import product", prod.folderName, error);
        setBulkProducts(prev => prev.map(item => item.id === prod.id ? { ...item, status: "error", errorMsg: error.message } : item));
      }
    }

    setBusy(false);
    setBulkProgress(null);

    if (successCount === activeProducts.length) {
      void dashboardSuccess("Import Complete", `Successfully imported all ${successCount} products!`);
      setTimeout(() => router.push("/admin/inventory"), 1500);
    } else {
      void dashboardError(
        "Import Finished with Warnings",
        `Imported ${successCount} of ${activeProducts.length} successfully. Please check folders with errors.`
      );
    }
  }

  // Sync default values to all pending bulk products
  function applyDefaultsToAll() {
    setBulkProducts(prev => prev.map(p => {
      if (p.status !== "pending") return p;
      return {
        ...p,
        region: defaultRegion,
        subcategory: TAXONOMY[defaultRegion]?.includes(p.subcategory) ? p.subcategory : (TAXONOMY[defaultRegion]?.[0] || ""),
        priceUsd: defaultPrice,
        gender: defaultGender,
        fabricType: defaultFabric,
        embroideryStyle: defaultEmbroidery,
        tailoringDays: defaultTailoringDays,
        isFeatured: defaultFeatured,
        isActive: defaultActive
      };
    }));
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Catalog Management</p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Add New Outfit</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Register products in either Single or Bulk directory mode.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
              Discard
            </button>
            {uploadMode === "single" ? (
              <button onClick={handleSingleCreate} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Product
              </button>
            ) : (
              <button onClick={handleBulkImport} disabled={busy || bulkProducts.length === 0} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-900 transition-all active:scale-95 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Run Bulk Import
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mode Toggle Tabs */}
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => { if (!busy) setUploadMode("single"); }}
          disabled={busy}
          className={cn(
            "flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all",
            uploadMode === "single" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          Single Product Mode
        </button>
        <button
          onClick={() => { if (!busy) setUploadMode("multiple"); }}
          disabled={busy}
          className={cn(
            "flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all",
            uploadMode === "multiple" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          Multiple Products Mode (Bulk Folder)
        </button>
      </div>

      {formNotice && (
        <div className={cn(
          "flex items-center gap-4 rounded-[2rem] p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300",
          formNotice.tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {formNotice.tone === "success" ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          <div>
             <p className="font-black uppercase tracking-tight text-xl">{formNotice.title}</p>
             <p className="font-bold opacity-90">{formNotice.message}</p>
          </div>
        </div>
      )}

      {bulkProgress && (
        <div className="rounded-[2rem] bg-emerald-50 border border-emerald-200 p-6 text-emerald-800 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm uppercase tracking-wider">Bulk Import Progress</span>
            <span className="font-black">{bulkProgress.current} / {bulkProgress.total}</span>
          </div>
          <div className="h-3 w-full bg-emerald-200/50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
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
                    <label className="text-[10px] font-black uppercase text-slate-400">Region / Traditional Source</label>
                    <select
                      value={region}
                      onChange={e => {
                        setRegion(e.target.value);
                        setSubcategory(TAXONOMY[e.target.value]?.[0] || "");
                      }}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                    >
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Specific Sub-category</label>
                    <select
                      value={subcategory}
                      onChange={e => setSubcategory(e.target.value)}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                    >
                      {subsections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Customize Middle Title <span className="text-rose-500">*</span></label>
                  <div className="flex flex-wrap items-center font-bold text-slate-900 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                    <span className="bg-slate-100 px-4 py-3.5 border-r border-slate-200 select-none text-slate-500 text-sm">
                      {region} {subcategory}
                    </span>
                    <input
                      value={middleText}
                      onChange={e => setMiddleText(e.target.value)}
                      placeholder="e.g. Traditional Family Outfit"
                      className="flex-1 px-4 py-3 outline-none text-sm font-bold min-w-[200px]"
                    />
                    <span className="bg-slate-100 px-4 py-3.5 border-l border-slate-200 select-none text-slate-500 text-sm font-mono tracking-wider">
                      — {getRegionCode(region)}-{getSubcategoryCode(subcategory)}-{getNextIncrementNumber(region, subcategory)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Live Catalog Preview: <span className="text-emerald-700 font-mono font-black select-all ml-1">{region} {subcategory} {middleText.trim()} — {getRegionCode(region)}-{getSubcategoryCode(subcategory)}-{getNextIncrementNumber(region, subcategory)}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Detailed Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
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
                  <ImageIcon className="h-4 w-4" /> 4 Product Poses (Required)
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {["Pose 1 (Front)", "Pose 2 (Side)", "Pose 3 (Back)", "Pose 4 (Detail)"].map((label, idx) => {
                    const file = singleFiles[idx];
                    const fileUrl = file ? URL.createObjectURL(file) : null;
                    return (
                      <div key={idx} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-3 text-center shadow-sm">
                        {fileUrl ? (
                          <>
                            <img src={fileUrl} className="absolute inset-0 h-full w-full object-cover" />
                            <button
                              onClick={() => handleSingleFileChange(idx, null)}
                              className="absolute top-2 right-2 h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                            <Upload className="h-8 w-8 text-slate-300 mb-2 group-hover:text-emerald-600 transition-colors" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                            <span className="text-[8px] text-slate-300 mt-1 font-bold">CLICK TO UPLOAD</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleSingleFileChange(idx, e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
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
                  <label className="text-[10px] font-black uppercase text-slate-400">Garment Target Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Tailoring Days <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={tailoringDays}
                    onChange={e => setTailoringDays(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Fabric Texture</label>
                  <input
                    value={fabricType}
                    onChange={e => setFabricType(e.target.value)}
                    placeholder="e.g. Pure Cotton, Handwoven Shemma"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Embroidery Style</label>
                  <input
                    value={embroideryStyle}
                    onChange={e => setEmbroideryStyle(e.target.value)}
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
                  <label className="mb-1 block text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Price (USD) *</label>
                  <input
                    type="number"
                    value={priceUsd}
                    onChange={e => setPriceUsd(e.target.value)}
                    className="w-full bg-transparent text-xl font-black outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                  <label className="mb-1 block text-[10px] font-black uppercase text-slate-400 tracking-widest">Groom Price (Optional)</label>
                  <input
                    type="number"
                    value={groomPriceUsd}
                    onChange={e => setGroomPriceUsd(e.target.value)}
                    className="w-full bg-transparent text-lg font-black outline-none"
                    placeholder="0.00"
                  />
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
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">Featured Product</p>
                    <p className="text-[10px] font-bold text-slate-400">Home page hero boost</p>
                  </div>
                  <button
                    onClick={() => setIsFeatured(!isFeatured)}
                    className={cn("relative inline-flex h-6 w-11 rounded-full p-1 transition-all", isFeatured ? "bg-amber-500" : "bg-slate-200")}
                  >
                    <span className={cn("h-4 w-4 rounded-full bg-white transition-all", isFeatured ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-900 leading-none">Publicly Active</p>
                    <p className="text-[10px] font-bold text-slate-400">Visible for customers</p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={cn("relative inline-flex h-6 w-11 rounded-full p-1 transition-all", isActive ? "bg-emerald-500" : "bg-slate-200")}
                  >
                    <span className={cn("h-4 w-4 rounded-full bg-white transition-all", isActive ? "translate-x-5" : "translate-x-0")} />
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
              <FolderOpen className="h-4 w-4" /> Step 1: Set Default values for Bulk import
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Region</label>
                <select
                  value={defaultRegion}
                  onChange={e => {
                    setDefaultRegion(e.target.value);
                    setDefaultSubcategory(TAXONOMY[e.target.value]?.[0] || "");
                  }}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Sub-category</label>
                <select
                  value={defaultSubcategory}
                  onChange={e => setDefaultSubcategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                >
                  {(TAXONOMY[defaultRegion] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Price (USD)</label>
                <input
                  type="number"
                  value={defaultPrice}
                  onChange={e => setDefaultPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Gender</label>
                <select
                  value={defaultGender}
                  onChange={e => setDefaultGender(e.target.value)}
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
                <label className="text-[10px] font-black uppercase text-slate-400">Fabric Type</label>
                <input
                  value={defaultFabric}
                  onChange={e => setDefaultFabric(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Embroidery Style</label>
                <input
                  value={defaultEmbroidery}
                  onChange={e => setDefaultEmbroidery(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Tailoring Days</label>
                <input
                  type="number"
                  value={defaultTailoringDays}
                  onChange={e => setDefaultTailoringDays(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-8 mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400">Featured (Hero Boost)</span>
                <button
                  onClick={() => setDefaultFeatured(!defaultFeatured)}
                  className={cn("relative inline-flex h-5 w-10 rounded-full p-0.5 transition-all", defaultFeatured ? "bg-amber-500" : "bg-slate-200")}
                >
                  <span className={cn("h-4 w-4 rounded-full bg-white transition-all", defaultFeatured ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400">Active (Public View)</span>
                <button
                  onClick={() => setDefaultActive(!defaultActive)}
                  className={cn("relative inline-flex h-5 w-10 rounded-full p-0.5 transition-all", defaultActive ? "bg-emerald-500" : "bg-slate-200")}
                >
                  <span className={cn("h-4 w-4 rounded-full bg-white transition-all", defaultActive ? "translate-x-5" : "translate-x-0")} />
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
            <h4 className="text-sm font-bold text-slate-900 mb-1">Upload Root Folder</h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Select a root folder. We will discover subfolders and expect 4 pose images in each subdirectory to build unique catalog items.
            </p>
            <label className="cursor-pointer inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all">
              <FolderOpen className="h-4 w-4" /> Select Root Directory
              <input
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={handleFolderSelect}
              />
            </label>
          </section>

          {/* Grouped Folders Listing Table */}
          {bulkProducts.length > 0 && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                  <Shirt className="h-4 w-4" /> Step 2: Configure & Verify Detected Product Folders
                </h3>
                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
                  Total Items: {bulkProducts.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-200 text-left text-xs text-slate-800 bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-12">Import</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-40">Subfolder Name</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Images Previews</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest">Region / Subcategory</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest">Custom Middle Name</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-24">Price (USD)</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {bulkProducts.map(prod => {
                      const subsections = TAXONOMY[prod.region] ?? [];
                      return (
                        <tr key={prod.id} className={cn("hover:bg-slate-50 transition-colors", !prod.import && "opacity-50")}>
                          <td className="px-6 py-6">
                            <input
                              type="checkbox"
                              checked={prod.import}
                              disabled={busy}
                              onChange={e => updateBulkProduct(prod.id, "import", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-6 select-all">
                            <span className="font-mono text-slate-900 block truncate max-w-[150px]" title={prod.folderName}>
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
                                        url: fileUrl
                                      });
                                    }}
                                    className="relative h-20 w-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 cursor-zoom-in hover:scale-105 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                                    title="Click to cross-check image"
                                  >
                                    <img src={fileUrl} className="h-full w-full object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-wider opacity-0 hover:opacity-100 transition-opacity">
                                      View
                                    </div>
                                  </div>
                                );
                              })}
                              {prod.files.length !== 4 && (
                                <div className="text-[10px] text-rose-600 font-bold flex items-center bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 shrink-0 max-w-[150px] leading-tight">
                                  Error: Need exactly 4 files (got {prod.files.length})
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-6 space-y-1">
                            <select
                              value={prod.region}
                              disabled={busy}
                              onChange={e => updateBulkProduct(prod.id, "region", e.target.value)}
                              className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none"
                            >
                              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select
                              value={prod.subcategory}
                              disabled={busy}
                              onChange={e => updateBulkProduct(prod.id, "subcategory", e.target.value)}
                              className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none"
                            >
                              {subsections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <input
                                value={prod.middleText}
                                disabled={busy}
                                onChange={e => updateBulkProduct(prod.id, "middleText", e.target.value)}
                                className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none font-bold"
                              />
                              <p className="text-[9px] text-slate-400 select-all font-mono">
                                suffix: — {getRegionCode(prod.region)}-{getSubcategoryCode(prod.subcategory)}-...
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <input
                              type="number"
                              value={prod.priceUsd}
                              disabled={busy}
                              onChange={e => updateBulkProduct(prod.id, "priceUsd", e.target.value)}
                              className="w-full rounded border border-slate-200 p-1.5 text-[11px] outline-none font-bold"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-6 py-6">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                              prod.status === "pending" && "bg-slate-100 text-slate-500",
                              prod.status === "uploading" && "bg-blue-100 text-blue-700 animate-pulse",
                              prod.status === "success" && "bg-emerald-100 text-emerald-700",
                              prod.status === "error" && "bg-rose-100 text-rose-700"
                            )}>
                              {prod.status}
                            </span>
                            {prod.errorMsg && (
                              <span className="block text-[8px] text-rose-500 font-normal leading-tight mt-1 max-w-[120px] truncate" title={prod.errorMsg}>
                                {prod.errorMsg}
                              </span>
                            )}
                          </td>
                        </tr>
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
              <img src={previewImage.url} alt="" className="h-full w-full object-contain" />
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
