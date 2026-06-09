"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Edit3, FolderTree, Layers3, Plus, Trash2 } from "lucide-react";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

const ADMIN_SECTION_SAVE_EVENT = "admin-sections:save-section";

type SectionItem = {
  id: string;
  name: string;
  visible: boolean;
  subsections: string[];
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function AdminSectionManager({ externalSearch }: { externalSearch?: string }) {
  const [sections, setSections] = useState<SectionItem[]>(
    REGIONS.map((region) => ({
      id: toSlug(region),
      name: region,
      visible: true,
      subsections: TAXONOMY[region] ?? [],
    })),
  );
  const [search] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [selectedId, setSelectedId] = useState(sections[0]?.id ?? "");
  const [sectionName, setSectionName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subsectionName, setSubsectionName] = useState("");
  const [editingSubsection, setEditingSubsection] = useState<{ sectionId: string; name: string } | null>(null);
  const sectionNameInputRef = useRef<HTMLInputElement | null>(null);

  const filteredSections = useMemo(() => {
    const needle = effectiveSearch.trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter(
      (section) =>
        section.name.toLowerCase().includes(needle) ||
        section.subsections.some((subsection) => subsection.toLowerCase().includes(needle)),
    );
  }, [effectiveSearch, sections]);

  const selectedSection = sections.find((section) => section.id === selectedId) ?? sections[0];

  function resetSectionForm() {
    setSectionName("");
    setEditingId(null);
  }

  function saveSection() {
    const name = sectionName.trim();
    if (!name) return;
    if (editingId) {
      setSections((current) => current.map((section) => (section.id === editingId ? { ...section, name } : section)));
      resetSectionForm();
      return;
    }
    const newSection = { id: `${toSlug(name)}-${Date.now()}`, name, visible: true, subsections: [] };
    setSections((current) => [newSection, ...current]);
    setSelectedId(newSection.id);
    resetSectionForm();
  }

  useEffect(() => {
    const startSectionCreate = () => {
      resetSectionForm();
      sectionNameInputRef.current?.focus();
    };
    window.addEventListener(ADMIN_SECTION_SAVE_EVENT, startSectionCreate);
    return () => window.removeEventListener(ADMIN_SECTION_SAVE_EVENT, startSectionCreate);
  }, []);

  function deleteSection(sectionId: string) {
    setSections((current) => {
      const next = current.filter((section) => section.id !== sectionId);
      if (selectedId === sectionId) setSelectedId(next[0]?.id ?? "");
      return next;
    });
  }

  function toggleVisible(sectionId: string) {
    setSections((current) => current.map((section) => (section.id === sectionId ? { ...section, visible: !section.visible } : section)));
  }

  function saveSubsection() {
    if (!selectedSection) return;
    const name = subsectionName.trim();
    if (!name) return;
    setSections((current) =>
      current.map((section) => {
        if (section.id !== selectedSection.id) return section;
        if (editingSubsection) {
          return {
            ...section,
            subsections: section.subsections.map((subsection) => (subsection === editingSubsection.name ? name : subsection)),
          };
        }
        return { ...section, subsections: [...section.subsections, name] };
      }),
    );
    setSubsectionName("");
    setEditingSubsection(null);
  }

  function deleteSubsection(sectionId: string, subsectionName: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, subsections: section.subsections.filter((subsection) => subsection !== subsectionName) }
          : section,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Home Catalog Sections</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Section Management</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Manage storefront sections and subsections shown on the home page navigation.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {sections.filter((section) => section.visible).length} visible / {sections.length} total
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto]">
          <input
            ref={sectionNameInputRef}
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder={editingId ? "Update section name" : "New section name"}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={saveSection}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Update Section" : "Add Section"}
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3 px-2">
            <FolderTree className="h-5 w-5 text-emerald-700" />
            <h3 className="text-lg font-extrabold text-slate-950">Sections</h3>
          </div>
          <div className="space-y-3">
            {filteredSections.map((section) => (
              <article
                key={section.id}
                onClick={() => setSelectedId(section.id)}
                className={`cursor-pointer rounded-3xl border p-4 transition hover:border-blue-200 hover:bg-blue-50 ${selectedSection?.id === section.id ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                      <Layers3 className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-950">{section.name}</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{section.subsections.length} subsections</p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${section.visible ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                      >
                        {section.visible ? "Displayed on home" : "Hidden from home"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleVisible(section.id)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {section.visible ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(section.id);
                        setSectionName(section.name);
                      }}
                      className="rounded-xl bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSection(section.id)}
                      className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedSection ? (
            <>
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Inside Section</p>
                  <h3 className="mt-1 text-2xl font-extrabold text-slate-950">{selectedSection.name}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">Add, edit, or delete subsections displayed under this home section.</p>
                </div>
                <span className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  {selectedSection.subsections.length} subsections
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={subsectionName}
                  onChange={(event) => setSubsectionName(event.target.value)}
                  placeholder={editingSubsection ? "Update subsection name" : "New subsection name"}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={saveSubsection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  {editingSubsection ? "Update Subsection" : "Add Subsection"}
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                {selectedSection.subsections.length ? (
                  <div className="divide-y divide-slate-200">
                    {selectedSection.subsections.map((subsection, index) => (
                      <div key={`${subsection}-${index}`} className="flex items-center justify-between gap-3 bg-white px-5 py-4 transition hover:bg-blue-50">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-700">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-950">{subsection}</p>
                            <p className="text-xs font-semibold text-slate-500">{selectedSection.name} / {subsection}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubsection({ sectionId: selectedSection.id, name: subsection });
                              setSubsectionName(subsection);
                            }}
                            className="rounded-xl bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSubsection(selectedSection.id, subsection)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FolderTree className="mx-auto h-10 w-10 text-slate-400" />
                    <h4 className="mt-3 text-lg font-extrabold text-slate-950">No subsections yet</h4>
                    <p className="mt-1 text-sm font-medium text-slate-500">Add a subsection to organize products inside this section.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Select a section to view subsections.</div>
          )}
        </section>
      </div>
    </div>
  );
}
