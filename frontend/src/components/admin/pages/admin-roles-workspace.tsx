"use client";

import { useMemo, useRef, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  ClipboardList,
  KeyRound,
  Plus,
  Save,
  ScrollText,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { dashboardAlert, dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { DASHBOARD_PERMISSION_REQUIREMENTS, coverageRowId, type PermissionRequirement } from "@/lib/admin/permission-coverage";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  roleStatus?: "unassigned" | "assigned";
  assignedRoleId?: string | null;
};

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
  color?: string | null;
  icon?: string | null;
  isSystem: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  action: string;
  category: string;
  severity: string;
  entityType?: string | null;
  entityId?: string | null;
  performedBy?: string | null;
  details?: string | null;
  createdAt?: string | null;
};

type RoleFormState = {
  name: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "Active" | "Inactive";
};

type MatrixAction = "view" | "create" | "edit" | "delete" | "manage" | "approve" | "upload" | "export" | "verify" | "refund" | "assign" | "close";
type MatrixRow = {
  resource: string;
  moduleName: string;
  permissions: Partial<Record<MatrixAction, Permission[]>>;
};
type PermissionCoverageRow = PermissionRequirement & {
  permission?: Permission;
  usedByRoles: number;
  status: "available" | "missing";
};
type ActiveTab = "roles" | "permissions" | "employee-access" | "activity";
type DetailMode = "view" | "edit" | "create";

const ADMIN_ROLE_TABS = [
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "employee-access", label: "Employee Access", icon: UserCheck },
  { id: "activity", label: "Activity", icon: ScrollText },
];

const ACTION_LABELS: Record<MatrixAction, string> = {
  view: "VIEW",
  create: "CREATE",
  edit: "EDIT",
  delete: "DELETE",
  manage: "MANAGE",
  approve: "APPROVE",
  upload: "UPLOAD",
  export: "EXPORT",
  verify: "VERIFY",
  refund: "REFUND",
  assign: "ASSIGN",
  close: "CLOSE",
};

const ACTION_ALIASES: Record<MatrixAction, string[]> = {
  view: ["view", "read", "list"],
  create: ["create", "add", "write"],
  edit: ["edit", "update"],
  delete: ["delete", "remove"],
  manage: ["manage", "status.update"],
  approve: ["approve"],
  upload: ["upload"],
  export: ["export", "download"],
  verify: ["verify"],
  refund: ["refund"],
  assign: ["assign"],
  close: ["close", "resolve"],
};

const PRIORITY_TO_COLOR: Record<RoleFormState["priority"], string> = {
  High: "blue",
  Medium: "indigo",
  Low: "slate",
};

function titleCase(value: string) {
  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAction(action: string): MatrixAction | null {
  const value = action.toLowerCase();
  const match = (Object.keys(ACTION_ALIASES) as MatrixAction[]).find((key) =>
    ACTION_ALIASES[key].includes(value),
  );
  return match ?? null;
}

function roleToForm(role?: Role): RoleFormState {
  const roleStatus = role?.color === "inactive" ? "Inactive" : "Active";
  return {
    name: role?.name ?? "",
    description: role?.description ?? "",
    priority: role?.color === "slate" ? "Low" : role?.color === "indigo" ? "Medium" : "High",
    status: roleStatus,
  };
}

function groupPermissions(permissions: Permission[]): MatrixRow[] {
  const rows = new Map<string, MatrixRow>();

  permissions.forEach((permission) => {
    const action = normalizeAction(permission.action);
    if (!action) return;

    const resource = permission.resource || permission.key.split(".")[0] || "general";
    const moduleName = titleCase(resource);
    const row = rows.get(resource) ?? { resource, moduleName, permissions: {} };
    row.permissions[action] = [...(row.permissions[action] ?? []), permission];
    rows.set(resource, row);
  });

  return Array.from(rows.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

function roleSearchText(role: Role) {
  return [role.name, role.key, role.description, role.permissions?.join(" ")].join(" ").toLowerCase();
}

function isCustomerRole(role: Role) {
  return [role.key, role.name].some((value) => String(value ?? "").toLowerCase().includes("customer"));
}

function isAssignableEmployeeRole(role: Role) {
  return !role.isSystem && !["admin", "employee", "customer"].includes(String(role.key ?? "").toLowerCase());
}

function roleStatusLabel(role?: Role) {
  return role?.color === "inactive" ? "Inactive" : "Active";
}

function roleStatusClass(role?: Role) {
  return roleStatusLabel(role) === "Inactive"
    ? "bg-slate-200 text-slate-700"
    : "bg-emerald-100 text-emerald-700";
}

export const ADMIN_ROLE_CREATE_EVENT = "admin-roles:create-role";

export function AdminRolesWorkspace({
  users,
  roles,
  permissions,
  audit,
}: {
  data: AdminWorkspaceData;
  users: User[];
  roles: Role[];
  permissions: Permission[];
  audit: AuditLog[];
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const sortedRoles = useMemo(() => roles.filter((role) => !isCustomerRole(role)).sort((a, b) => a.name.localeCompare(b.name)), [roles]);
  const [roleItems, setRoleItems] = useState<Role[]>(sortedRoles);
  const [userItems, setUserItems] = useState<User[]>(users);
  const [activeTab, setActiveTab] = useState<ActiveTab>("roles");
  const [query, setQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [matrixQuery, setMatrixQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(sortedRoles[0]?.id ?? "new");
  const [detailMode, setDetailMode] = useState<DetailMode>("edit");
  const [form, setForm] = useState<RoleFormState>(() => roleToForm(sortedRoles[0]));
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => sortedRoles[0]?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const roleNameInputRef = useRef<HTMLInputElement>(null);

  const searchNeedle = query.trim().toLowerCase();
  const roleSearchNeedle = roleQuery.trim().toLowerCase();
  const matrixSearchNeedle = matrixQuery.trim().toLowerCase();
  const selectedRole = roleItems.find((role) => role.id === selectedRoleId);
  const isCreating = detailMode === "create" || selectedRoleId === "new" || !selectedRole;
  const readOnly = detailMode === "view";
  const matrixRows = useMemo(() => groupPermissions(permissions), [permissions]);

  const filteredRoles = useMemo(() => {
    if (!roleSearchNeedle) return roleItems;
    return roleItems.filter((role) => roleSearchText(role).includes(roleSearchNeedle));
  }, [roleItems, roleSearchNeedle]);

  const filteredMatrixRows = useMemo(() => {
    if (!matrixSearchNeedle) return matrixRows;
    return matrixRows.filter((row) =>
      [
        row.moduleName,
        row.resource,
        ...Object.values(row.permissions).flatMap((permissionsForAction) =>
          permissionsForAction?.flatMap((permission) => [permission.key, permission.description, permission.action, permission.resource]) ?? [],
        ),
      ].some((value) => String(value ?? "").toLowerCase().includes(matrixSearchNeedle)),
    );
  }, [matrixRows, matrixSearchNeedle]);

  const filteredPermissions = useMemo(() => {
    if (!searchNeedle) return permissions;
    return permissions.filter((permission) =>
      [permission.key, permission.resource, permission.action, permission.description]
        .some((value) => String(value ?? "").toLowerCase().includes(searchNeedle)),
    );
  }, [permissions, searchNeedle]);

  const filteredEmployees = useMemo(() => {
    if (!searchNeedle) return userItems;
    return userItems.filter((user) => {
      const assignedRole = roleItems.find((role) => role.id === user.assignedRoleId);
      return [user.name, user.email, user.status, user.roleStatus, assignedRole?.name]
        .some((value) => String(value ?? "").toLowerCase().includes(searchNeedle));
    });
  }, [roleItems, searchNeedle, userItems]);

  const filteredAudit = useMemo(() => {
    if (!searchNeedle) return audit;
    return audit.filter((log) =>
      [log.action, log.category, log.severity, log.entityType, log.entityId, log.performedBy, log.details]
        .some((value) => String(value ?? "").toLowerCase().includes(searchNeedle)),
    );
  }, [audit, searchNeedle]);

  const permissionCoverageRows = useMemo<PermissionCoverageRow[]>(() => {
    return DASHBOARD_PERMISSION_REQUIREMENTS.map((requirement) => {
      const permission = permissions.find((item) => item.key === requirement.permissionKey);
      return {
        ...requirement,
        permission,
        usedByRoles: roleItems.filter((role) => role.permissions?.includes(requirement.permissionKey)).length,
        status: permission ? "available" : "missing",
      };
    });
  }, [permissions, roleItems]);

  const filteredDashboardRows = useMemo(() => {
    if (!searchNeedle) return permissionCoverageRows;
    return permissionCoverageRows.filter((row) =>
      [row.area, row.route, row.subLinks?.join(" "), row.feature, row.action, row.permissionKey, row.note]
        .some((value) => String(value ?? "").toLowerCase().includes(searchNeedle)),
    );
  }, [permissionCoverageRows, searchNeedle]);

  const resultCount =
    activeTab === "roles"
      ? filteredRoles.length
      : activeTab === "permissions"
        ? filteredDashboardRows.length
        : activeTab === "employee-access"
          ? filteredEmployees.length
          : filteredAudit.length;

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  function openRole(role: Role, mode: DetailMode) {
    setActiveTab("roles");
    setSelectedRoleId(role.id);
    setDetailMode(mode);
    setForm(roleToForm(role));
    setSelectedPermissions(role.permissions ?? []);
    setMessage(null);
  }

  function startNewRole() {
    setActiveTab("roles");
    setSelectedRoleId("new");
    setDetailMode("create");
    setForm({ name: "", description: "", priority: "High", status: "Active" });
    setSelectedPermissions([]);
    setMessage(null);
  }

  function focusRoleNameInput() {
    window.setTimeout(() => roleNameInputRef.current?.focus(), 0);
  }

  function addRoleAndFocus() {
    startNewRole();
    focusRoleNameInput();
  }

  function togglePermission(key: string) {
    if (readOnly) return;
    setSelectedPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function saveChanges() {
    const name = form.name.trim();
    if (!name) {
      setMessage({ tone: "error", text: "Role name is required." });
      await dashboardError("Validation Error", "Role name is required.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const rolePayload = {
        name,
        description: form.description.trim(),
        color: form.status === "Inactive" ? "inactive" : PRIORITY_TO_COLOR[form.priority],
        icon: "shield",
      };
      const roleResponse = await fetch(
        isCreating ? "/api/backend/admin/roles" : `/api/backend/admin/roles/${selectedRole.id}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rolePayload),
        },
      );
      const roleJson = await roleResponse.json();
      if (!roleResponse.ok) throw new Error(roleJson?.error ?? "Could not save role.");

      const savedRole = roleJson.data as Role;
      const permissionResponse = await fetch(`/api/backend/admin/roles/${savedRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const permissionJson = await permissionResponse.json();
      if (!permissionResponse.ok) {
        throw new Error(permissionJson?.error ?? "Role saved, but permissions could not be updated.");
      }

      const updatedRole = { ...savedRole, permissions: selectedPermissions };
      setRoleItems((current) =>
        isCreating
          ? [...current, updatedRole].sort((a, b) => a.name.localeCompare(b.name))
          : current.map((role) => (role.id === updatedRole.id ? { ...role, ...updatedRole } : role)),
      );
      setSelectedRoleId(updatedRole.id);
      setDetailMode("edit");
      setMessage({ tone: "success", text: "Role and permissions saved successfully." });
      await dashboardSuccess("Role Saved", "Role status and permissions saved successfully.");
    } catch (error) {
      await dashboardError("Save Failed", error instanceof Error ? error.message : "Could not save role and permissions.");
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save role and permissions.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedRole() {
    if (!selectedRole || isCreating) return;
    if (selectedRole.isSystem) {
      await dashboardError("Delete Failed", "System roles cannot be deleted.");
      return;
    }

    const assignedCount = userItems.filter((user) => user.assignedRoleId === selectedRole.id).length;
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: assignedCount
        ? `The role "${selectedRole.name}" is assigned to ${assignedCount} employee${assignedCount === 1 ? "" : "s"}. Deleting it will move them to access pending.`
        : `The role "${selectedRole.name}" will be permanently deleted.`,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/roles/${selectedRole.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not delete role.");
      setRoleItems((current) => current.filter((role) => role.id !== selectedRole.id));
      setUserItems((current) =>
        current.map((user) =>
          user.assignedRoleId === selectedRole.id ? { ...user, assignedRoleId: null, roleStatus: "unassigned" } : user,
        ),
      );
      startNewRole();
      await dashboardAlert("Deleted Successfully", "Role has been deleted successfully.", {
        icon: "success",
        tone: "success",
        confirmButtonText: "OK",
      });
      focusRoleNameInput();
    } catch (error) {
      await dashboardAlert("Delete Failed", error instanceof Error ? error.message : "Unable to delete role. Please try again.", {
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveEmployeeRole(user: User, nextRoleId: string) {
    const nextRole = nextRoleId ? roleItems.find((role) => role.id === nextRoleId && isAssignableEmployeeRole(role)) : null;
    if (nextRoleId && !nextRole) {
      await dashboardError("Role Unavailable", "The selected role no longer exists. Refresh the page and try again.");
      return false;
    }

    if (nextRole && roleStatusLabel(nextRole) === "Inactive") {
      await dashboardError("Inactive Role", "Inactive roles cannot be assigned to employees. Activate the role before assigning it.");
      return false;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: nextRoleId || null, permissions: [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not update employee role.");
      setUserItems((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                assignedRoleId: nextRoleId || null,
                roleStatus: nextRoleId ? "assigned" : "unassigned",
              }
            : item,
        ),
      );
      await dashboardSuccess("Updated Successfully", "Employee role updated successfully.");
      return true;
    } catch (error) {
      await dashboardError("Update Failed", error instanceof Error ? error.message : "Could not update employee role.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployeeRole(user: User) {
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: "This employee role assignment will be deleted. The employee will move to access pending.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return false;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: null, permissions: [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not delete employee role.");
      setUserItems((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                assignedRoleId: null,
                roleStatus: "unassigned",
              }
            : item,
        ),
      );
      await dashboardAlert("Deleted Successfully", "Employee role has been deleted successfully.", {
        icon: "success",
        tone: "success",
        confirmButtonText: "OK",
      });
      return true;
    } catch (error) {
      await dashboardAlert("Delete Failed", error instanceof Error ? error.message : "Unable to delete employee role. Please try again.", {
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl space-y-5">
        <AdminPageHeader
          pageId="roles"
          title="Role & Permissions"
          subtitle="Manage employee roles, dashboard access, assigned users, and permission coverage."
          onRefresh={refreshPage}
          isRefreshing={isRefreshing}
          primaryAction={
            <button
              type="button"
              onClick={addRoleAndFocus}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"
            >
              <Plus className="h-4 w-4" />
              Add Role
            </button>
          }
        />

        <AdminTabs tabs={ADMIN_ROLE_TABS} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as ActiveTab)} />

        {activeTab !== "roles" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:max-w-[448px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search permissions, dashboard links, employees..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <RecordsBadge count={resultCount} />
            </div>
          </section>
        ) : null}

        {message ? (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-semibold",
              message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
            )}
          >
            {message.text}
          </div>
        ) : null}

        {activeTab === "roles" ? (
          <section className="grid gap-6 lg:grid-cols-[298px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="flex min-h-[70px] items-center justify-between border-b border-slate-200 px-5">
                <h2 className="text-lg font-bold">Roles</h2>
                <button
                  type="button"
                  onClick={addRoleAndFocus}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-950"
                  aria-label="Add role"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="border-b border-slate-100 p-4">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={roleQuery}
                    onChange={(event) => setRoleQuery(event.target.value)}
                    placeholder="Search roles..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
              <div className="max-h-[650px] overflow-y-auto px-4 py-4">
                {isCreating ? (
                  <button
                    type="button"
                    onClick={addRoleAndFocus}
                    className="mb-2 block w-full border-l-4 border-violet-600 bg-violet-50/70 px-4 py-4 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-bold text-slate-950">New Role</span>
                      <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Active</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">Configure role information</p>
                  </button>
                ) : null}
                {filteredRoles.map((role) => {
                  const active = role.id === selectedRoleId;
                  const assignedCount = userItems.filter((user) => user.assignedRoleId === role.id).length;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => openRole(role, "edit")}
                      className={cn(
                        "block w-full border-b border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50",
                        active && "border-l-4 border-l-violet-600 bg-violet-50/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold text-slate-950">{role.name}</span>
                        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", roleStatusClass(role))}>
                          {roleStatusLabel(role)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {role.description || `${assignedCount} assigned ${assignedCount === 1 ? "employee" : "employees"}`}
                      </p>
                    </button>
                  );
                })}
                {filteredRoles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">
                    No roles match your search.
                  </div>
                ) : null}
              </div>
            </aside>

            <RoleEditor
              busy={busy}
              detailMode={detailMode}
              form={form}
              canDeleteRole={Boolean(selectedRole && !isCreating && !selectedRole.isSystem)}
              matrixQuery={matrixQuery}
              matrixRows={filteredMatrixRows}
              readOnly={readOnly}
              roleNameInputRef={roleNameInputRef}
              selectedPermissions={selectedPermissions}
              selectedRole={selectedRole}
              setDetailMode={setDetailMode}
              setForm={setForm}
              setMatrixQuery={setMatrixQuery}
              deleteSelectedRole={deleteSelectedRole}
              saveChanges={saveChanges}
              togglePermission={togglePermission}
            />
          </section>
        ) : null}

        {activeTab === "permissions" ? (
          <PermissionsTable dashboardRows={filteredDashboardRows} permissions={filteredPermissions} roleItems={roleItems} />
        ) : null}

        {activeTab === "employee-access" ? (
          <EmployeeAccessTable
            busy={busy}
            roleItems={roleItems.filter(isAssignableEmployeeRole)}
            users={filteredEmployees}
            deleteEmployeeRole={deleteEmployeeRole}
            saveEmployeeRole={saveEmployeeRole}
          />
        ) : null}

        {activeTab === "activity" ? <ActivityTable audit={filteredAudit} /> : null}
      </div>
    </main>
  );
}

function RecordsBadge({ count }: { count: number }) {
  return (
    <div className="inline-flex h-12 items-center gap-2 px-1 text-sm font-bold text-slate-700">
      <ClipboardList className="h-5 w-5 text-orange-500" />
      <span>Records</span>
      <span className="font-black text-slate-950">{count.toLocaleString()}</span>
    </div>
  );
}

function RoleEditor({
  busy,
  canDeleteRole,
  deleteSelectedRole,
  detailMode,
  form,
  matrixQuery,
  matrixRows,
  readOnly,
  roleNameInputRef,
  selectedPermissions,
  selectedRole,
  setDetailMode,
  setForm,
  setMatrixQuery,
  saveChanges,
  togglePermission,
}: {
  busy: boolean;
  canDeleteRole: boolean;
  deleteSelectedRole: () => Promise<void>;
  detailMode: DetailMode;
  form: RoleFormState;
  matrixQuery: string;
  matrixRows: MatrixRow[];
  readOnly: boolean;
  roleNameInputRef: RefObject<HTMLInputElement | null>;
  selectedPermissions: string[];
  selectedRole?: Role;
  setDetailMode: (mode: DetailMode) => void;
  setForm: (updater: (current: RoleFormState) => RoleFormState) => void;
  setMatrixQuery: (value: string) => void;
  saveChanges: () => Promise<void>;
  togglePermission: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5">
          <div>
            <h2 className="text-lg font-bold">Role Information</h2>
            <p className="text-xs font-semibold text-slate-500">
              {detailMode === "create" ? "Create a new role" : `${detailMode === "view" ? "Viewing" : "Editing"} ${selectedRole?.name ?? "role"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => setDetailMode("edit")}
                  className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Edit Role
                </button>
                {canDeleteRole ? (
                  <button
                    type="button"
                    onClick={() => void deleteSelectedRole()}
                    disabled={busy}
                    className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {busy ? "Saving..." : "Save Changes"}
                </button>
                {canDeleteRole ? (
                  <button
                    type="button"
                    onClick={() => void deleteSelectedRole()}
                    disabled={busy}
                    className="inline-flex h-10 items-center rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="space-y-7 p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_210px_210px]">
            <label className="relative block">
              <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-600">Role Name*</span>
              <input
                ref={roleNameInputRef}
                value={form.name}
                readOnly={readOnly}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-14 w-full rounded border border-slate-300 bg-white px-4 pr-12 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 read-only:bg-slate-50"
              />
              <BriefcaseBusiness className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </label>

            <label className="relative block">
              <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-600">Priority Level</span>
              <select
                value={form.priority}
                disabled={readOnly}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: event.target.value as RoleFormState["priority"] }))
                }
                className="h-14 w-full rounded border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>

            <label className="relative block">
              <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-600">Status</span>
              <select
                value={form.status}
                disabled={readOnly}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as RoleFormState["status"] }))
                }
                className="h-14 w-full rounded border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>

          <label className="relative block">
            <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-slate-600">Description</span>
            <textarea
              value={form.description}
              readOnly={readOnly}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="min-h-[80px] w-full rounded border border-slate-300 bg-white px-4 py-4 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 read-only:bg-slate-50"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Permissions Matrix</h2>
            <p className="text-xs font-semibold text-slate-500">Assign dashboard and workflow permissions by module.</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={matrixQuery}
              onChange={(event) => setMatrixQuery(event.target.value)}
              placeholder="Search permissions..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
        <MatrixTable
          matrixRows={matrixRows}
          readOnly={readOnly}
          selectedPermissions={selectedPermissions}
          togglePermission={togglePermission}
        />
      </div>
    </div>
  );
}

function MatrixTable({
  matrixRows,
  readOnly,
  selectedPermissions,
  togglePermission,
}: {
  matrixRows: MatrixRow[];
  readOnly?: boolean;
  selectedPermissions: string[];
  togglePermission: (key: string) => void;
}) {
  return (
    <div className="max-h-[620px] overflow-auto p-4">
      <table className="w-full min-w-[2200px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-50 text-xs font-bold text-slate-500">
            <th className="sticky left-0 z-30 w-[180px] min-w-[180px] bg-slate-50 px-5 py-4">MODULE NAME</th>
            {(Object.keys(ACTION_LABELS) as MatrixAction[]).map((action) => (
              <th key={action} className="w-[165px] min-w-[165px] px-4 py-4 text-left">
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrixRows.length ? (
            matrixRows.map((row) => (
              <tr key={row.resource} className="border-t border-slate-200">
                <td className="sticky left-0 z-10 w-[180px] min-w-[180px] bg-white px-5 py-4 font-medium text-slate-950 shadow-[8px_0_16px_rgba(15,23,42,0.04)]">{row.moduleName}</td>
                {(Object.keys(ACTION_LABELS) as MatrixAction[]).map((action) => {
                  const permissionsForAction = row.permissions[action] ?? [];
                  return (
                    <td key={action} className="w-[165px] min-w-[165px] px-3 py-4 align-top">
                      {permissionsForAction.length ? (
                        <div className="flex flex-col items-start gap-2">
                          {permissionsForAction.map((permission) => (
                            <label
                              key={permission.key}
                              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(permission.key)}
                                disabled={readOnly}
                                onChange={() => togglePermission(permission.key)}
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-400 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                aria-label={`${permission.key} permission`}
                              />
                              <span className="whitespace-nowrap font-mono text-[11px] font-bold leading-4 text-slate-700">
                                {permission.key}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="flex justify-center text-slate-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={Object.keys(ACTION_LABELS).length + 1} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                No permissions are available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PermissionsTable({
  dashboardRows,
  permissions,
  roleItems,
}: {
  dashboardRows: PermissionCoverageRow[];
  permissions: Permission[];
  roleItems: Role[];
}) {
  const mappedKeys = new Set(DASHBOARD_PERMISSION_REQUIREMENTS.map((item) => item.permissionKey));
  const extraPermissions = permissions.filter((permission) => !mappedKeys.has(permission.key));

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[72px] px-5 py-4">No</th>
                <th className="px-5 py-4">Area</th>
                <th className="px-5 py-4">Feature</th>
                <th className="px-5 py-4">Required Permission</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboardRows.map((row, index) => (
                <tr key={`${row.route}-${row.permissionKey}-${row.feature}`} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950">{row.area}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {row.subLinks?.length ? row.subLinks.join(", ") : "Main dashboard item"}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{row.feature}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-800">
                      {row.permissionKey}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-black",
                        row.status === "available"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      )}
                      title={row.status === "missing" ? "This permission is required by the dashboard but has not been created in the permissions table." : undefined}
                    >
                      {row.status === "available" ? "Available" : "Not Created"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <DashboardTableActions>
                      <DashboardActionButton action="view" href={`/admin/roles/coverage/${coverageRowId(row)}`}>
                        View
                      </DashboardActionButton>
                    </DashboardTableActions>
                  </td>
                </tr>
              ))}
              {dashboardRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center font-semibold text-slate-500">
                    No permission coverage rows match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {extraPermissions.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Additional Permission Inventory</h2>
            <p className="text-sm font-medium text-slate-500">Permissions that exist but are not tied to a dashboard action row above.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Permission Key</th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Used By Roles</th>
                </tr>
              </thead>
              <tbody>
                {extraPermissions.map((permission) => {
                  const usedBy = roleItems.filter((role) => role.permissions?.includes(permission.key)).length;
                  return (
                    <tr key={permission.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-950">{permission.key}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {titleCase(permission.resource)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{titleCase(permission.action)}</td>
                      <td className="px-5 py-4 text-slate-600">{permission.description ?? "No description provided."}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{usedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmployeeAccessTable({
  busy,
  roleItems,
  users,
  deleteEmployeeRole,
  saveEmployeeRole,
}: {
  busy: boolean;
  roleItems: Role[];
  users: User[];
  deleteEmployeeRole: (user: User) => Promise<boolean>;
  saveEmployeeRole: (user: User, roleId: string) => Promise<boolean>;
}) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState("");
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  function openEdit(user: User) {
    setEditingUser(user);
    setEditingRoleId(user.assignedRoleId ?? "");
  }

  async function submitEdit() {
    if (!editingUser) return;
    const saved = await saveEmployeeRole(editingUser, editingRoleId);
    if (saved) setEditingUser(null);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[72px] px-5 py-4">No</th>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Assigned Role</th>
                <th className="px-5 py-4">Role Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const assignedRole = roleItems.find((role) => role.id === user.assignedRoleId);

                return (
                  <tr key={user.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 font-bold text-slate-950">{user.name ?? "Unnamed employee"}</td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {titleCase(user.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex min-h-9 items-center rounded-xl border px-3 text-sm font-bold",
                          assignedRole
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {assignedRole?.name ?? "No role / Access pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold",
                          user.roleStatus === "assigned"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {titleCase(user.roleStatus ?? (assignedRole ? "assigned" : "unassigned"))}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <DashboardTableActions className="min-w-[240px]">
                        <DashboardActionButton action="view" disabled={!assignedRole} onClick={() => setViewingUser(user)}>
                          View
                        </DashboardActionButton>
                        <DashboardActionButton action="update" disabled={busy} onClick={() => openEdit(user)}>
                          Edit
                        </DashboardActionButton>
                        <DashboardActionButton action="delete" disabled={busy} onClick={() => void deleteEmployeeRole(user)}>
                          Delete
                        </DashboardActionButton>
                      </DashboardTableActions>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center font-semibold text-slate-500">
                    No employees match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {viewingUser ? (
        (() => {
          const assignedRole = roleItems.find((role) => role.id === viewingUser.assignedRoleId);
          const rolePermissions = assignedRole?.permissions ?? [];
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
              <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-6 py-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Role permissions</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{assignedRole?.name ?? "No role assigned"}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {viewingUser.name ?? viewingUser.email}
                  </p>
                </div>
                <div className="px-6 py-5">
                  {assignedRole ? (
                    <>
                      <p className="text-sm font-bold text-slate-900">
                        {assignedRole.name} grants {rolePermissions.length} permission{rolePermissions.length === 1 ? "" : "s"}.
                      </p>
                      <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        {rolePermissions.length ? rolePermissions.map((permission) => (
                          <span key={permission} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                            {permission}
                          </span>
                        )) : (
                          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                            This role has no permissions yet
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      No role selected. Employee access is pending.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setViewingUser(null)}
                    className="inline-flex h-10 items-center rounded-xl bg-slate-700 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : null}

  {editingUser ? (
        (() => {
          const selectedRole = roleItems.find((role) => role.id === editingRoleId);
          const selectedRolePermissions = selectedRole?.permissions ?? [];
          return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-black text-slate-950">Edit Employee Role</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {editingUser.name ?? editingUser.email}
              </p>
            </div>
            <div className="space-y-5 px-6 py-5">
              <label className="block text-sm">
                <span className="mb-2 block font-bold text-slate-700">Assigned Role</span>
                <select
                  value={editingRoleId}
                  onChange={(event) => setEditingRoleId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">No role / Access pending</option>
                  {roleItems.map((role) => (
                    <option key={role.id} value={role.id} disabled={roleStatusLabel(role) === "Inactive"}>
                      {role.name}{roleStatusLabel(role) === "Inactive" ? " (Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Role permission preview</p>
                {selectedRole ? (
                  <>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedRole.name} grants {selectedRolePermissions.length} permission{selectedRolePermissions.length === 1 ? "" : "s"}.
                    </p>
                    <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                      {selectedRolePermissions.length ? selectedRolePermissions.map((permission) => (
                        <span key={permission} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">
                          {permission}
                        </span>
                      )) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                          This role has no permissions yet
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-bold text-amber-700">No role selected. Employee access will remain pending.</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitEdit()}
                className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
          );
        })()
      ) : null}
    </>
  );
}

function ActivityTable({ audit }: { audit: AuditLog[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Details</th>
              <th className="px-5 py-4">By</th>
              <th className="px-5 py-4">Severity</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((log) => (
              <tr key={log.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-5 py-4 text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Not provided"}</td>
                <td className="px-5 py-4 font-bold text-slate-950">{titleCase(log.action)}</td>
                <td className="px-5 py-4 text-slate-600">{log.details ?? log.entityType ?? "Access activity"}</td>
                <td className="px-5 py-4 text-slate-600">{log.performedBy ?? "system"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {titleCase(log.severity)}
                  </span>
                </td>
              </tr>
            ))}
            {audit.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center font-semibold text-slate-500">
                  No activity logs match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
