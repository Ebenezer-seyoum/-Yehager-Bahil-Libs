"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Edit, FileText, KeyRound, Power, Route, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";
import { dashboardAlert, dashboardConfirm, dashboardError, dashboardLoading, dashboardSuccess } from "@/lib/dashboard-swal";
import { coverageRowId, type PermissionRequirement } from "@/lib/admin/permission-coverage";
import { cn } from "@/lib/utils";

type Permission = {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
};

type CoverageDetailRow = PermissionRequirement & {
  permission?: Permission;
  status: "available" | "missing";
};

type PermissionForm = {
  key: string;
  resource: string;
  action: string;
  description: string;
};

type PermissionSectionId = "coverage" | "record" | "roles" | "notes";

function titleCase(value: string) {
  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function isCustomerRole(role: Role) {
  return [role.key, role.name].some((value) => String(value ?? "").toLowerCase().includes("customer"));
}

function roleInitials(role: Role) {
  return role.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "R";
}

function permissionToForm(row: CoverageDetailRow): PermissionForm {
  return {
    key: row.permission?.key ?? row.permissionKey,
    resource: row.permission?.resource ?? row.permissionKey.split(".")[0] ?? "",
    action: row.permission?.action ?? row.action.toLowerCase(),
    description: row.permission?.description ?? row.note ?? "",
  };
}

export function PermissionCoverageDetailClient({
  row,
  roleItems,
}: {
  row: CoverageDetailRow;
  roleItems: Role[];
}) {
  const router = useRouter();
  const [permission, setPermission] = useState(row.permission);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isActive, setIsActive] = useState(row.status === "available");
  const [form, setForm] = useState<PermissionForm>(() => permissionToForm(row));
  const [activeSection, setActiveSection] = useState<PermissionSectionId>("coverage");

  const effectiveRow = useMemo<CoverageDetailRow>(
    () => ({
      ...row,
      permission,
      status: permission ? "available" : "missing",
    }),
    [permission, row],
  );
  const usedByRoles = roleItems.filter((role) => !isCustomerRole(role) && role.permissions?.includes(effectiveRow.permissionKey));
  const canManagePermission = Boolean(permission);
  const statusLabel = permission ? (isActive ? "Available" : "Inactive") : "Not Created";
  const statusTone = permission && isActive
    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
    : permission
      ? "border-amber-200 bg-amber-100 text-amber-800"
      : "border-rose-200 bg-rose-100 text-rose-800";

  function goToSection(sectionId: PermissionSectionId) {
    setActiveSection(sectionId);
    if (typeof window === "undefined") return;
    const node = document.getElementById(sectionId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function startEdit() {
    setForm(permissionToForm(effectiveRow));
    setEditMode(true);
  }

  function cancelEdit() {
    setForm(permissionToForm(effectiveRow));
    setEditMode(false);
  }

  async function savePermission() {
    if (!permission) {
      await dashboardError("Edit Unavailable", "This coverage row does not have a saved permission record yet.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/backend/admin/permissions/${permission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: form.key.trim(),
          resource: form.resource.trim(),
          action: form.action.trim(),
          description: form.description.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not update permission.");
      setPermission(payload?.data ?? { ...permission, ...form, description: form.description.trim() || null });
      setEditMode(false);
      await dashboardSuccess("Permission Updated", "Permission details have been updated successfully.");
      router.refresh();
    } catch (error) {
      await dashboardError("Update Failed", error instanceof Error ? error.message : "Could not update permission.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePermission() {
    if (!permission) {
      await dashboardError("Delete Unavailable", "This coverage row does not have a saved permission record yet.");
      return;
    }

    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: "This permission record will be permanently deleted. This action cannot be undone.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      dashboardLoading("Deleting...", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/permissions/${permission.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not delete permission.");
      dashboardLoading.close();
      await dashboardAlert("Deleted Successfully", "Permission record has been deleted successfully.", {
        icon: "success",
        tone: "success",
        confirmButtonText: "OK",
      });
      router.push("/admin/roles");
      router.refresh();
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Delete Failed", error instanceof Error ? error.message : "Could not delete permission.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!permission) {
      await dashboardError("Status Unavailable", "This coverage row does not have a saved permission record yet.");
      return;
    }

    const nextActive = !isActive;
    const confirmed = await dashboardConfirm({
      title: nextActive ? "Activate this permission?" : "Deactivate this permission?",
      text: nextActive
        ? "Activating will mark this permission as available in the coverage detail."
        : "Deactivating will mark this permission inactive in this detail view.",
      confirmButtonText: nextActive ? "Yes, activate" : "Yes, deactivate",
      cancelButtonText: "No, cancel",
      tone: nextActive ? "success" : "warning",
      icon: "warning",
    });
    if (!confirmed) return;

    setIsActive(nextActive);
    await dashboardAlert(nextActive ? "Permission Activated" : "Permission Deactivated", nextActive ? "This permission is active now." : "This permission is inactive now.", {
      icon: "success",
      tone: "success",
      confirmButtonText: "OK",
    });
  }

  return (
    <AdminDetailLayout
      topHeader={
        <AdminDetailHeader
          icon={KeyRound}
          iconTheme="bg-[#f5f3ff] text-[#8b5cf6]"
          category="Permission Coverage Detail"
          title={effectiveRow.area}
          subtitle={effectiveRow.feature}
          onRefresh={() => router.refresh()}
          onBack={() => router.push("/admin/roles")}
          backLabel="Back to Permissions"
        />
      }
      sections={[
        { id: "coverage", label: "Coverage Details", icon: Route },
        { id: "record", label: "Permission Record", icon: ShieldCheck },
        { id: "roles", label: "Used By Roles", icon: KeyRound },
        { id: "notes", label: "Internal Notes", icon: FileText },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => goToSection(id as PermissionSectionId)}
      profileCard={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-[180px] w-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-[#f5f3ff] text-[#8b5cf6]">
              <KeyRound className="h-16 w-16" />
            </div>

            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <ShieldCheck className="h-5 w-5 text-slate-600" />
                <span>{effectiveRow.permissionKey}</span>
              </h1>
              <div className="mt-1 text-sm text-slate-600">Coverage ID: {coverageRowId(effectiveRow)}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone)}>
                  {statusLabel}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  {effectiveRow.action}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                  Roles: {usedByRoles.length}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1 text-sm text-slate-700">
                <span>{effectiveRow.route}</span>
                <span>{permission?.description ?? effectiveRow.note ?? "No permission description available."}</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto">
            {editMode ? (
              <>
                <button
                  type="button"
                  disabled={busy || !canManagePermission}
                  onClick={() => void savePermission()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancelEdit}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy || !canManagePermission}
                onClick={startEdit}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                <Edit className="h-4 w-4" />
                Edit Permission
              </button>
            )}

            <button
              type="button"
              disabled={busy || !canManagePermission}
              onClick={() => void toggleActive()}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50",
                isActive ? "bg-[#EA580C] hover:bg-[#C2410C]" : "bg-[#16A34A] hover:bg-[#15803D]",
              )}
            >
              <Power className="h-4 w-4" />
              {isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              disabled={busy || !canManagePermission}
              onClick={() => void deletePermission()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#DC2626] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Permission
            </button>
          </div>
        </div>
      }
    >
      {activeSection === "coverage" ? (
        <Section id="coverage" title="Coverage">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Dashboard area" value={effectiveRow.area} />
            <DetailField label="Route/path" value={effectiveRow.route} mono />
            <DetailField label="Sub-links" value={effectiveRow.subLinks?.length ? effectiveRow.subLinks.join(", ") : "Main dashboard item"} />
            <DetailField label="Feature/button" value={effectiveRow.feature} />
            <DetailField label="Action type" value={effectiveRow.action} />
            <DetailField label="Required permission" value={effectiveRow.permissionKey} mono />
          </div>
        </Section>
      ) : activeSection === "record" ? (
        <Section id="record" title="Permission Record">
          {editMode ? (
            <div className="grid gap-4 md:grid-cols-2">
              <EditField label="Permission key" value={form.key} onChange={(value) => setForm((current) => ({ ...current, key: value }))} mono />
              <EditField label="Resource" value={form.resource} onChange={(value) => setForm((current) => ({ ...current, resource: value }))} />
              <EditField label="Action" value={form.action} onChange={(value) => setForm((current) => ({ ...current, action: value }))} />
              <EditField label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Permission key" value={permission?.key ?? effectiveRow.permissionKey} mono />
              <DetailField label="Module" value={permission?.resource ? titleCase(permission.resource) : "Permission record not created"} />
              <DetailField label="Action" value={permission?.action ? titleCase(permission.action) : effectiveRow.action} />
              <DetailField label="Permission description" value={permission?.description ?? "No permission description available."} />
            </div>
          )}
        </Section>
      ) : activeSection === "roles" ? (
        <Section id="roles" title="Used By Roles">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Assigned roles" value={String(usedByRoles.length)} />
            <DetailField label="Permission status" value={statusLabel} />
          </div>
          <div className="mt-4 grid gap-3">
            {usedByRoles.length ? (
              usedByRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200">
                      {roleInitials(role)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{role.name}</p>
                      <p className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-500">{role.key}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {role.permissions?.length ?? 0} permissions
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        role.isSystem ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {role.isSystem ? "System" : "Custom"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
                No employee roles currently use this permission.
              </div>
            )}
          </div>
        </Section>
      ) : (
        <Section id="notes" title="Notes">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Coverage notes" value={effectiveRow.note ?? "No coverage note provided."} />
            <DetailField label="Permission description" value={permission?.description ?? "No permission description available."} />
          </div>
        </Section>
      )}
    </AdminDetailLayout>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className={cn("mt-1 break-words text-sm font-semibold text-slate-950", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100",
          mono && "font-mono text-xs",
        )}
      />
    </label>
  );
}
