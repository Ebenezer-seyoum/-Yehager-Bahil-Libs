"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Edit3, Eye, EyeOff, FolderTree, Layers3, Package, Plus, Save, Search, Trash2, X } from "lucide-react";
import { dashboardAlert, dashboardConfirm } from "@/lib/dashboard-swal";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const ADMIN_SECTION_SAVE_EVENT = "admin-sections:save-section";

type SubsectionItem = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type SectionItem = {
  id: string;
  name: string;
  slug?: string;
  isActive: boolean;
  sortOrder: number;
  collections?: SubsectionItem[];
  subsections: SubsectionItem[];
};

type SectionInput = Omit<SectionItem, "subsections"> & {
  collections?: SubsectionItem[];
  subsections?: SubsectionItem[];
};

type ProductItem = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  category?: string | null;
  images?: string[] | null;
  priceUsd?: string | number | null;
  uniqueId?: string | null;
  isActive?: boolean;
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeMatch(value: string | null | undefined) {
  return toSlug(value ?? "");
}

function normalizeSubsections(subsections: SubsectionItem[]) {
  return subsections.map((subsection, index) => ({
    id: String(subsection.id || `${toSlug(subsection.name)}-${index}`).slice(0, 160),
    name: subsection.name.trim(),
    isActive: subsection.isActive ?? true,
    sortOrder: Number.isFinite(Number(subsection.sortOrder)) ? Number(subsection.sortOrder) : index,
  }));
}

function getSectionCollections(section: Pick<SectionInput, "collections" | "subsections">) {
  return section.collections ?? section.subsections ?? [];
}

function apiErrorMessage(payload: unknown, fallback: string) {
  const raw =
    typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: unknown }).error ?? "")
      : "";
  if (raw.includes("API error 500")) {
    return "Collections API failed on the server. Please make sure the homepage collections migration has been applied, then try again.";
  }
  const match = raw.match(/"message"\s*:\s*"([^"]+)"/);
  if (match?.[1] && match[1] !== "Internal Server Error") return match[1];
  return raw || fallback;
}

function makeSubsection(name: string, index: number): SubsectionItem {
  return {
    id: `${toSlug(name)}-${Date.now()}-${index}`,
    name,
    isActive: true,
    sortOrder: index,
  };
}

function defaultSections(): SectionItem[] {
  return REGIONS.map((region, index) => ({
    id: `seed-${toSlug(region)}`,
    name: region,
    isActive: true,
    sortOrder: index,
    subsections: (TAXONOMY[region] ?? []).map((subsection, subIndex) => ({
      id: `seed-${toSlug(region)}-${toSlug(subsection)}`,
      name: subsection,
      isActive: true,
      sortOrder: subIndex,
    })),
  }));
}

function normalizeSections(sections: SectionInput[] | undefined): SectionItem[] {
  const defaults = defaultSections();
  if (!sections?.length) return defaults;

  const normalizedSaved = sections.map((section, index) => ({
    ...section,
    isActive: section.isActive ?? true,
    sortOrder: section.sortOrder ?? index,
    subsections: getSectionCollections(section).map((subsection, subIndex) => ({
      ...subsection,
      id: subsection.id || `${toSlug(subsection.name)}-${subIndex}`,
      isActive: subsection.isActive ?? true,
      sortOrder: subsection.sortOrder ?? subIndex,
    })),
  }));

  const savedByName = new Map(normalizedSaved.map((section) => [normalizeMatch(section.name), section]));
  const mergedDefaults = defaults.map((defaultSection) => {
    const saved = savedByName.get(normalizeMatch(defaultSection.name));
    if (!saved) return defaultSection;
    const savedCollections = new Map(saved.subsections.map((collection) => [normalizeMatch(collection.name), collection]));
    const mergedCollections = [
      ...defaultSection.subsections.map((collection) => savedCollections.get(normalizeMatch(collection.name)) ?? collection),
      ...saved.subsections.filter((collection) => !defaultSection.subsections.some((item) => normalizeMatch(item.name) === normalizeMatch(collection.name))),
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return { ...saved, subsections: mergedCollections };
  });
  const customSaved = normalizedSaved.filter((section) => !defaults.some((item) => normalizeMatch(item.name) === normalizeMatch(section.name)));
  return [...mergedDefaults, ...customSaved].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function normalizeSection(section: SectionInput) {
  return {
    ...section,
    isActive: section.isActive ?? true,
    sortOrder: section.sortOrder ?? 0,
    subsections: getSectionCollections(section).map((subsection, subIndex) => ({
      ...subsection,
      id: subsection.id || `${toSlug(subsection.name)}-${subIndex}`,
      isActive: subsection.isActive ?? true,
      sortOrder: subsection.sortOrder ?? subIndex,
    })),
  };
}

function upsertSectionByName(items: SectionItem[], saved: SectionItem) {
  const savedKey = normalizeMatch(saved.name);
  return normalizeSections([saved, ...items.filter((item) => normalizeMatch(item.name) !== savedKey)]);
}

function isPersisted(section: SectionItem) {
  return !section.id.startsWith("seed-");
}

export function AdminSectionManager({
  externalSearch,
  initialSections,
  products = [],
  canEdit = false,
  canDelete = false,
}: {
  externalSearch?: string;
  initialSections?: SectionInput[];
  products?: ProductItem[];
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [sections, setSections] = useState<SectionItem[]>(() => normalizeSections(initialSections));
  const [selectedId, setSelectedId] = useState("");
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [sectionFormName, setSectionFormName] = useState("");
  const [sectionFormActive, setSectionFormActive] = useState(true);
  const [sectionQuery, setSectionQuery] = useState("");
  const [subsectionQuery, setSubsectionQuery] = useState("");
  const [subsectionName, setSubsectionName] = useState("");
  const [expandedSubsectionId, setExpandedSubsectionId] = useState<string | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<{ sectionId: string; subsectionId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const sectionNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const nextSections = normalizeSections(initialSections);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(nextSections);
    setSelectedId((current) => nextSections.some((section) => section.id === current) ? current : "");
    setExpandedSubsectionId((current) =>
      nextSections.some((section) => section.subsections.some((subsection) => subsection.id === current)) ? current : null,
    );
  }, [initialSections]);

  const filteredSections = useMemo(() => {
    const needle = [externalSearch, sectionQuery].filter(Boolean).join(" ").trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter(
      (section) =>
        section.name.toLowerCase().includes(needle) ||
        section.subsections.some((subsection) => subsection.name.toLowerCase().includes(needle)),
    );
  }, [externalSearch, sectionQuery, sections]);

  const selectedSection = sections.find((section) => section.id === selectedId) ?? null;

  function toggleSection(section: SectionItem) {
    setIsCreatingSection(false);
    setSelectedId(section.id);
    setSectionFormName(section.name);
    setSectionFormActive(section.isActive);
    setExpandedSubsectionId(null);
  }

  const writeSection = useCallback(async (section: SectionItem, patch: Partial<SectionItem>) => {
    if (!canEdit) throw new Error("You do not have permission to edit homepage collections.");
    const body = {
      name: patch.name ?? section.name,
      isActive: patch.isActive ?? section.isActive,
      sortOrder: patch.sortOrder ?? section.sortOrder,
      collections: normalizeSubsections(patch.subsections ?? section.subsections),
    };
    const response = await fetch(
      isPersisted(section) ? `/api/backend/admin/homepage-sections/${section.id}` : "/api/backend/admin/homepage-sections",
      {
        method: isPersisted(section) ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(apiErrorMessage(payload, "Could not save homepage collection."));
    return normalizeSection(payload.data as SectionItem);
  }, [canEdit]);

  const createSectionByName = useCallback(async (name: string, isActive = true) => {
    const draft: SectionItem = {
      id: `seed-${toSlug(name)}`,
      name,
      isActive,
      sortOrder: sections.length,
      subsections: [],
    };
    const saved = await writeSection(draft, {});
    setSections((items) => upsertSectionByName(items, saved));
    setSelectedId(saved.id);
    setExpandedSubsectionId(null);
    setIsCreatingSection(false);
    setSectionFormName(saved.name);
    setSectionFormActive(saved.isActive);
    return saved;
  }, [sections.length, writeSection]);

  function startSectionCreate() {
    if (!canEdit) return;
    setIsCreatingSection(true);
    setSelectedId("");
    setSectionFormName("");
    setSectionFormActive(true);
    setExpandedSubsectionId(null);
    window.setTimeout(() => sectionNameInputRef.current?.focus(), 0);
  }

  async function saveSectionChanges() {
    if (!canEdit) return;
    const name = sectionFormName.trim();
    if (!name) {
      await dashboardAlert("Validation Error", "Region name is required.", { icon: "error", tone: "danger" });
      return;
    }

    setBusy(true);
    try {
      if (isCreatingSection) {
        const existing = sections.find((section) => normalizeMatch(section.name) === normalizeMatch(name));
        if (existing && isPersisted(existing)) {
          setSelectedId(existing.id);
          setIsCreatingSection(false);
          setSectionFormName(existing.name);
          setSectionFormActive(existing.isActive);
          await dashboardAlert("Region Exists", `"${existing.name}" already exists. It is now selected in the left list.`, { icon: "info", tone: "warning" });
          return;
        }
        await createSectionByName(name, sectionFormActive);
        await dashboardAlert("Region Added", "New region has been created.", { icon: "success", tone: "success" });
      } else if (selectedSection) {
        const saved = await writeSection(selectedSection, { name, isActive: sectionFormActive });
        setSections((items) => upsertSectionByName(items.filter((item) => item.id !== selectedSection.id), saved));
        setSelectedId(saved.id);
        setSectionFormName(saved.name);
        setSectionFormActive(saved.isActive);
        await dashboardAlert("Region Updated", "Region details have been saved.", { icon: "success", tone: "success" });
      }
    } catch (error) {
      await dashboardAlert("Save Failed", error instanceof Error ? error.message : "Could not save homepage region.", { icon: "error", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleSectionFormActive() {
    if (!canEdit) return;
    const nextActive = !sectionFormActive;
    const confirmed = await dashboardConfirm({
      title: nextActive ? "Activate this region?" : "Deactivate this region?",
      text: nextActive ? "This region will be available for customer-facing placement." : "This region will be hidden from customer-facing placement.",
      confirmButtonText: nextActive ? "Yes, activate" : "Yes, deactivate",
      cancelButtonText: "Cancel",
      tone: nextActive ? "success" : "warning",
      icon: "warning",
    });
    if (confirmed) setSectionFormActive(nextActive);
  }

  useEffect(() => {
    if (!canEdit) return;
    window.addEventListener(ADMIN_SECTION_SAVE_EVENT, startSectionCreate);
    return () => window.removeEventListener(ADMIN_SECTION_SAVE_EVENT, startSectionCreate);
  }, [canEdit]);

  async function deleteSection(section: SectionItem) {
    if (!canDelete) return;
    const confirmed = await dashboardConfirm({
      title: "Delete this region?",
      text: `The region "${section.name}" and its collections will be removed from homepage Categories.`,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      if (isPersisted(section)) {
        const response = await fetch(`/api/backend/admin/homepage-sections/${section.id}`, { method: "DELETE" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, "Could not delete homepage collection."));
      }
      setSections((items) => {
        const next = items.filter((item) => item.id !== section.id);
        if (selectedId === section.id) {
          setSelectedId("");
          setExpandedSubsectionId(null);
          setIsCreatingSection(false);
          setSectionFormName("");
          setSectionFormActive(true);
        }
        return next;
      });
      await dashboardAlert("Region Deleted", "Homepage region has been deleted.", { icon: "success", tone: "success" });
    } catch (error) {
      await dashboardAlert("Delete Failed", error instanceof Error ? error.message : "Could not delete homepage region.", { icon: "error", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function patchSection(section: SectionItem, patch: Partial<SectionItem>, successMessage: string) {
    if (!canEdit) return;
    setBusy(true);
    try {
      const saved = await writeSection(section, patch);
      setSections((items) => upsertSectionByName(items.filter((item) => item.id !== section.id), saved));
      setSelectedId(saved.id);
      await dashboardAlert("Updated", successMessage, { icon: "success", tone: "success" });
    } catch (error) {
      await dashboardAlert("Update Failed", error instanceof Error ? error.message : "Could not update homepage collection.", { icon: "error", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function saveSubsection() {
    if (!canEdit) return;
    if (!selectedSection) return;
    const name = subsectionName.trim();
    if (!name) {
      await dashboardAlert("Validation Error", "Collection name is required.", { icon: "error", tone: "danger" });
      return;
    }

    const nextSubsections = editingSubsection
      ? selectedSection.subsections.map((subsection) =>
          subsection.id === editingSubsection.subsectionId ? { ...subsection, name } : subsection,
        )
      : [...selectedSection.subsections, makeSubsection(name, selectedSection.subsections.length)];

    await patchSection(selectedSection, { subsections: nextSubsections }, editingSubsection ? "Collection updated." : "Collection added.");
    setSubsectionName("");
    setEditingSubsection(null);
    if (!editingSubsection) setExpandedSubsectionId(nextSubsections.at(-1)?.id ?? null);
  }

  async function deleteSubsection(section: SectionItem, subsection: SubsectionItem) {
    if (!canDelete) return;
    const confirmed = await dashboardConfirm({
      title: "Delete this collection?",
      text: `"${subsection.name}" will be removed from ${section.name}.`,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    await patchSection(
      section,
      { subsections: section.subsections.filter((item) => item.id !== subsection.id) },
      "Collection deleted.",
    );
  }

  function productsForSubsection(subsection: SubsectionItem) {
    const subsectionKey = normalizeMatch(subsection.name);
    const sectionKey = normalizeMatch(selectedSection?.name);
    return products.filter((product) => {
      const productRegion = normalizeMatch(product.region);
      const productSubcategory = normalizeMatch(product.subcategory);
      const productCategory = normalizeMatch(product.category);
      const subsectionMatches = productSubcategory === subsectionKey || productCategory === subsectionKey || productRegion === subsectionKey;
      const sectionMatches = productRegion === sectionKey;
      return subsectionMatches || (sectionMatches && (!productSubcategory || productSubcategory === subsectionKey));
    });
  }

  async function toggleSubsectionActive(section: SectionItem, subsection: SubsectionItem) {
    if (!canEdit) return;
    const nextActive = !subsection.isActive;
    const confirmed = await dashboardConfirm({
      title: nextActive ? "Activate this collection?" : "Deactivate this collection?",
      text: nextActive ? `"${subsection.name}" will become available in this region.` : `"${subsection.name}" will be hidden in this region.`,
      confirmButtonText: nextActive ? "Yes, activate" : "Yes, deactivate",
      cancelButtonText: "Cancel",
      tone: nextActive ? "success" : "warning",
      icon: "warning",
    });
    if (!confirmed) return;
    await patchSection(
      section,
      {
        subsections: section.subsections.map((item) =>
          item.id === subsection.id ? { ...item, isActive: nextActive } : item,
        ),
      },
      nextActive ? "Collection activated." : "Collection deactivated.",
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-6 lg:grid-cols-[298px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex min-h-[70px] items-center justify-between border-b border-slate-200 px-5">
            <div className="flex items-center gap-3">
              <FolderTree className="h-5 w-5 text-emerald-700" />
              <h3 className="text-lg font-black text-slate-950">Regions</h3>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{filteredSections.length}</span>
          </div>
          <div className="border-b border-slate-100 p-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={sectionQuery}
                onChange={(event) => setSectionQuery(event.target.value)}
                placeholder="Search regions..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <div className="max-h-[650px] overflow-y-auto px-4 py-4">
            {isCreatingSection ? (
              <button
                type="button"
                onClick={startSectionCreate}
                className="mb-2 block w-full border-l-4 border-violet-600 bg-violet-50/70 px-4 py-4 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-bold text-slate-950">New Region</span>
                  <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Draft</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">Configure region details</p>
              </button>
            ) : null}
            {filteredSections.map((section) => (
              <div
                key={section.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleSection(section)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") toggleSection(section);
                }}
                className={cn(
                  "mb-2 block w-full cursor-pointer border-b border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50",
                  selectedSection?.id === section.id && "border-l-4 border-l-violet-600 bg-violet-50/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                      <Layers3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate font-black text-slate-950">{section.name}</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {section.subsections.length} collections
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-black",
                            section.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                          )}
                        >
                          {section.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      title={selectedSection?.id === section.id ? "Collapse" : "Expand"}
                      onClick={() => toggleSection(section)}
                      className="rounded-xl bg-slate-700 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {selectedSection?.id === section.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                No regions match your search.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedSection || isCreatingSection ? (
            <>
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Region Details</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{isCreatingSection ? "New Region" : selectedSection?.name}</h3>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-end">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">Region Name</span>
                    <input
                      ref={sectionNameInputRef}
                      value={sectionFormName}
                      onChange={(event) => setSectionFormName(event.target.value)}
                      placeholder="Enter region name"
                      readOnly={!canEdit}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void toggleSectionFormActive()}
                        className={cn(
                          "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition",
                          sectionFormActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                        )}
                      >
                        {sectionFormActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {sectionFormActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveSectionChanges()}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black",
                        sectionFormActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                      )}
                    >
                      {sectionFormActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {sectionFormActive ? "Active" : "Inactive"}
                    </span>
                  )}
                  {!isCreatingSection && selectedSection && canDelete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteSection(selectedSection)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                </div>

                {!isCreatingSection && selectedSection ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                        {selectedSection.subsections.filter((item) => item.isActive).length} active / {selectedSection.subsections.length} total
                      </span>
                    </div>
                  </div>
                ) : null}

                {!isCreatingSection && selectedSection ? (
                  <>
                    <div className={canEdit ? "grid gap-3 xl:grid-cols-[minmax(180px,0.9fr)_minmax(220px,1fr)_auto_auto]" : "grid gap-3"}>
                      <label className="relative block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={subsectionQuery}
                          onChange={(event) => setSubsectionQuery(event.target.value)}
                          placeholder="Search collections..."
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>
                      {canEdit ? (
                        <>
                          <input
                            value={subsectionName}
                            onChange={(event) => setSubsectionName(event.target.value)}
                            placeholder={editingSubsection ? "Update collection name" : "New collection name"}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                          />
                          {editingSubsection ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubsection(null);
                                setSubsectionName("");
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void saveSubsection()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {editingSubsection ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {editingSubsection ? "Update" : "Add Collection"}
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      {selectedSection.subsections.length ? (
                        <div className="divide-y divide-slate-200">
                          {selectedSection.subsections
                            .slice()
                            .filter((subsection) => subsection.name.toLowerCase().includes(subsectionQuery.trim().toLowerCase()))
                            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                            .map((subsection, index) => {
                              const expanded = expandedSubsectionId === subsection.id;
                              const subsectionProducts = productsForSubsection(subsection);
                              return (
                                <div key={subsection.id} className="bg-white">
                                  <div className={cn("flex items-center justify-between gap-3 px-5 py-4 transition", expanded && "bg-emerald-50")}>
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">
                                        {index + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-black text-slate-950">{subsection.name}</p>
                                        <p className="text-xs font-semibold text-slate-500">{subsectionProducts.length} products</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex",
                                          subsection.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                                        )}
                                      >
                                        {subsection.isActive ? "Active" : "Inactive"}
                                      </span>
                                      {canEdit ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={busy}
                                            title={subsection.isActive ? "Deactivate" : "Activate"}
                                            onClick={() => void toggleSubsectionActive(selectedSection, subsection)}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                          >
                                            {subsection.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                          </button>
                                          <button
                                            type="button"
                                            disabled={busy}
                                            title="Edit"
                                            onClick={() => {
                                              setEditingSubsection({ sectionId: selectedSection.id, subsectionId: subsection.id });
                                              setSubsectionName(subsection.name);
                                            }}
                                            className="rounded-xl bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : null}
                                      {canDelete ? (
                                        <button
                                          type="button"
                                          disabled={busy}
                                          title="Delete"
                                          onClick={() => void deleteSubsection(selectedSection, subsection)}
                                          className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSubsectionId(expanded ? null : subsection.id)}
                                        className="rounded-xl bg-slate-700 px-3 py-2 text-white hover:bg-slate-800"
                                        title={expanded ? "Collapse products" : "Expand products"}
                                      >
                                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  {expanded ? (
                                    subsectionProducts.length ? (
                                      <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                                        {subsectionProducts.map((product) => (
                                          <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            <div className="aspect-[4/3] bg-slate-100">
                                              {product.images?.[0] ? <img src={product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                                            </div>
                                            <div className="space-y-2 p-4">
                                              <h4 className="line-clamp-2 text-sm font-black uppercase tracking-tight text-slate-950">{product.name}</h4>
                                              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">#{product.uniqueId ?? product.id.slice(0, 8)}</span>
                                                <span className={cn("rounded-full px-2 py-1", product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                                  {product.isActive ? "Active" : "Hidden"}
                                                </span>
                                              </div>
                                              <p className="text-sm font-black text-slate-900">${Number(product.priceUsd ?? 0).toFixed(2)}</p>
                                            </div>
                                          </article>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="border-t border-slate-200 bg-slate-50 p-8 text-center">
                                        <Package className="mx-auto h-9 w-9 text-slate-400" />
                                        <p className="mt-2 text-sm font-black text-slate-900">No products assigned</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">Add products using {selectedSection.name} / {subsection.name}.</p>
                                      </div>
                                    )
                                  ) : null}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
                          <h4 className="mt-3 text-lg font-black text-slate-950">No collections yet</h4>
                          <p className="mt-1 text-sm font-medium text-slate-500">Add a collection to organize catalog links under this region.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
                    <h4 className="mt-3 text-lg font-black text-slate-950">Save region details first</h4>
                    <p className="mt-1 text-sm font-medium text-slate-500">After saving, you can add collections and expand products inline.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <div>
                <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-lg font-black text-slate-950">Expand a region</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Use the left panel to expand a region and manage its collections.</p>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
