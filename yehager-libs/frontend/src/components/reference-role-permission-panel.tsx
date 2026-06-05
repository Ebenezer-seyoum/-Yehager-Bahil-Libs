"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Edit3, Eye, Plus, Search, Trash2 } from "lucide-react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { employeeNavigation } from "@/lib/dashboard-navigation";
import { dashboardConfirm, dashboardError, dashboardLoading, dashboardSuccess, dashboardSwalOptions } from "@/lib/dashboard-swal";

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

function titleCase(value: string) {
  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function ReferenceRolePermissionPanel({
  users,
  permissions,
  roles,
  audit,
  activeTab,
}: {
  users: User[];
  permissions: Permission[];
  roles: Role[];
  audit: AuditLog[];
  activeTab: string;
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(users[0]?.assignedRoleId ?? "");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [userItems, setUserItems] = useState(users);
  const [roleItems, setRoleItems] = useState(roles);
  const [permissionItems, setPermissionItems] = useState(permissions);
  const [roleSearch, setRoleSearch] = useState("");
  const [securitySearch, setSecuritySearch] = useState("");

  const filteredPermissions = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return permissionItems;
    return permissionItems.filter((permission) =>
      [permission.key, permission.resource, permission.action, permission.description]
        .some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [filter, permissionItems]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    if (!query) return roleItems;
    return roleItems.filter((role) =>
      [role.name, role.key, role.description].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [roleItems, roleSearch]);

  const filteredUsers = useMemo(() => {
    const query = roleFilter.trim().toLowerCase();
    if (!query) return userItems;
    return userItems.filter((user) =>
      [user.name, user.email, user.status, user.roleStatus].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [roleFilter, userItems]);

  const filteredAudit = useMemo(() => {
    const query = securitySearch.trim().toLowerCase();
    if (!query) return audit;
    return audit.filter((log) =>
      [log.action, log.category, log.severity, log.entityType, log.entityId, log.performedBy, log.details]
        .some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [audit, securitySearch]);

  function selectEmployee(userId: string) {
    setSelectedUserId(userId);
    const user = userItems.find((item) => item.id === userId);
    setSelectedRoleId(user?.assignedRoleId ?? "");
    setSelectedPermissions([]);
    setLoadedFor(null);
    setMessage(null);
  }

  async function loadPermissions(userId: string) {
    selectEmployee(userId);
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/users/${userId}/permissions`);
      const payload = await response.json();
      setSelectedPermissions(Array.isArray(payload?.data) ? payload.data : []);
      setLoadedFor(userId);
    } finally {
      setBusy(false);
    }
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) {
      setMessage("Select a role before saving permissions.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Role permission update failed");
      setRoleItems((current) =>
        current.map((role) => (role.id === selectedRoleId ? { ...role, permissions: selectedPermissions } : role)),
      );
      setMessage("Role permissions updated successfully.");
    } catch {
      setMessage("Could not update role permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function assignRoleAccess() {
    if (!selectedUserId) {
      setMessage("Please select an employee.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/users/${selectedUserId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRoleId || null,
          permissions: selectedPermissions,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error ?? "Could not assign role.");
        return;
      }
      setMessage(selectedRoleId || selectedPermissions.length ? "Employee access saved successfully." : "Employee access removed. The employee will see Access Pending.");
    } catch {
      setMessage("Could not assign role.");
    } finally {
      setBusy(false);
    }
  }

  async function createRole() {
    const result = await Swal.fire(
      dashboardSwalOptions({
        title: "Create New Role",
        html: `
          <div class="space-y-3 text-left">
            <label class="block text-sm font-semibold text-slate-700">Role Name</label>
            <input id="create-role-name" class="swal2-input" placeholder="e.g. Custom Design Reviewer" />
            <label class="block text-sm font-semibold text-slate-700">Description</label>
            <textarea id="create-role-description" class="swal2-textarea" placeholder="What should this employee role manage?"></textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Create Role",
        cancelButtonText: "Cancel",
        customClass: {
          confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
          cancelButton: "dashboard-swal-cancel",
        },
        preConfirm: () => {
          const name = String((document.getElementById("create-role-name") as HTMLInputElement | null)?.value ?? "").trim();
          const description = String((document.getElementById("create-role-description") as HTMLTextAreaElement | null)?.value ?? "").trim();
          if (!name) {
            Swal.showValidationMessage("Role name is required.");
            return false;
          }
          return { name, description };
        },
      }),
    );
    if (!result.isConfirmed || !result.value) return;
    setMessage(null);
    try {
      dashboardLoading("Creating role…", "Please wait a moment.");
      const response = await fetch("/api/backend/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Role creation failed");
      setRoleItems((current) => [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)));
      setMessage("Role created successfully.");
      dashboardLoading.close();
      await dashboardSuccess("Role Created", "New employee role has been created successfully.");
    } catch (error) {
      dashboardLoading.close();
      setMessage("Could not create role.");
      await dashboardError("Create Failed", error instanceof Error ? error.message : "Could not create role.");
    }
  }

  async function editRole(role: Role) {
    const result = await Swal.fire(
      dashboardSwalOptions({
        title: "Edit Role",
        html: `
          <div class="space-y-3 text-left">
            <label class="block text-sm font-semibold text-slate-700">Role Name</label>
            <input id="role-name" class="swal2-input" value="${role.name.replace(/"/g, "&quot;")}" />
            <label class="block text-sm font-semibold text-slate-700">Description</label>
            <textarea id="role-description" class="swal2-textarea">${role.description ?? ""}</textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Save Changes",
        cancelButtonText: "Cancel",
        customClass: {
          confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
          cancelButton: "dashboard-swal-cancel",
        },
        preConfirm: () => {
          const name = String((document.getElementById("role-name") as HTMLInputElement | null)?.value ?? "").trim();
          const description = String((document.getElementById("role-description") as HTMLTextAreaElement | null)?.value ?? "").trim();
          if (!name) {
            Swal.showValidationMessage("Role name is required.");
            return false;
          }
          return { name, description };
        },
      }),
    );
    if (!result.isConfirmed || !result.value) return;
    try {
      dashboardLoading("Updating role…", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not update role.");
      setRoleItems((current) => current.map((item) => (item.id === role.id ? { ...item, ...payload.data } : item)));
      dashboardLoading.close();
      await dashboardSuccess("Role Updated", "Role information has been updated successfully.");
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Update Failed", error instanceof Error ? error.message : "Could not update role.");
    }
  }

  async function deleteRole(role: Role) {
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: `The role "${role.name}" will be permanently deleted. Employees using it will lose that role assignment.`,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    try {
      dashboardLoading("Deleting role…", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/roles/${role.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not delete role.");
      setRoleItems((current) => current.filter((item) => item.id !== role.id));
      setUserItems((current) =>
        current.map((user) =>
          user.assignedRoleId === role.id ? { ...user, assignedRoleId: null, roleStatus: "unassigned" } : user,
        ),
      );
      if (selectedRoleId === role.id) setSelectedRoleId("");
      dashboardLoading.close();
      await dashboardSuccess("Deleted Successfully", "Role has been deleted successfully.");
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Delete Failed", error instanceof Error ? error.message : "Unable to delete role.");
    }
  }

  async function editPermission(permission: Permission) {
    const result = await Swal.fire(
      dashboardSwalOptions({
        title: "Edit Permission",
        html: `
          <div class="space-y-3 text-left">
            <label class="block text-sm font-semibold text-slate-700">Permission Key</label>
            <input id="permission-key" class="swal2-input" value="${permission.key.replace(/"/g, "&quot;")}" />
            <label class="block text-sm font-semibold text-slate-700">Resource</label>
            <input id="permission-resource" class="swal2-input" value="${permission.resource.replace(/"/g, "&quot;")}" />
            <label class="block text-sm font-semibold text-slate-700">Action</label>
            <input id="permission-action" class="swal2-input" value="${permission.action.replace(/"/g, "&quot;")}" />
            <label class="block text-sm font-semibold text-slate-700">Description</label>
            <textarea id="permission-description" class="swal2-textarea">${permission.description ?? ""}</textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Save Changes",
        cancelButtonText: "Cancel",
        customClass: {
          confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
          cancelButton: "dashboard-swal-cancel",
        },
        preConfirm: () => {
          const key = String((document.getElementById("permission-key") as HTMLInputElement | null)?.value ?? "").trim();
          const resource = String((document.getElementById("permission-resource") as HTMLInputElement | null)?.value ?? "").trim();
          const action = String((document.getElementById("permission-action") as HTMLInputElement | null)?.value ?? "").trim();
          const description = String((document.getElementById("permission-description") as HTMLTextAreaElement | null)?.value ?? "").trim();
          if (!key || !resource || !action) {
            Swal.showValidationMessage("Key, resource, and action are required.");
            return false;
          }
          return { key, resource, action, description };
        },
      }),
    );
    if (!result.isConfirmed || !result.value) return;
    try {
      dashboardLoading("Updating permission…", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/permissions/${permission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not update permission.");
      setPermissionItems((current) => current.map((item) => (item.id === permission.id ? payload.data : item)));
      setRoleItems((current) =>
        current.map((role) => ({
          ...role,
          permissions: role.permissions?.map((key) => (key === permission.key ? payload.data.key : key)),
        })),
      );
      setSelectedPermissions((current) => current.map((key) => (key === permission.key ? payload.data.key : key)));
      dashboardLoading.close();
      await dashboardSuccess("Permission Updated", "Permission information has been updated successfully.");
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Update Failed", error instanceof Error ? error.message : "Could not update permission.");
    }
  }

  async function deletePermission(permission: Permission) {
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: `The permission "${permission.key}" will be deleted and removed from roles/users that use it.`,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    try {
      dashboardLoading("Deleting permission…", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/permissions/${permission.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not delete permission.");
      setPermissionItems((current) => current.filter((item) => item.id !== permission.id));
      setRoleItems((current) =>
        current.map((role) => ({
          ...role,
          permissions: role.permissions?.filter((key) => key !== permission.key),
        })),
      );
      setSelectedPermissions((current) => current.filter((key) => key !== permission.key));
      dashboardLoading.close();
      await dashboardSuccess("Deleted Successfully", "Permission has been deleted successfully.");
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Delete Failed", error instanceof Error ? error.message : "Unable to delete permission.");
    }
  }

  async function editEmployeeRole(user: User) {
    const options = roleItems
      .filter((role) => !role.isSystem)
      .map((role) => `<option value="${role.id}" ${role.id === user.assignedRoleId ? "selected" : ""}>${role.name}</option>`)
      .join("");
    const result = await Swal.fire(
      dashboardSwalOptions({
        title: "Edit Employee Role",
        html: `
          <div class="text-left">
            <p class="mb-3 text-sm text-slate-600">${user.name ?? user.email}</p>
            <select id="employee-role" class="swal2-select">
              <option value="">No role / access pending</option>
              ${options}
            </select>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Save Role",
        cancelButtonText: "Cancel",
        customClass: {
          confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
          cancelButton: "dashboard-swal-cancel",
        },
        preConfirm: () => ({ roleId: String((document.getElementById("employee-role") as HTMLSelectElement | null)?.value ?? "") }),
      }),
    );
    if (!result.isConfirmed || !result.value) return;
    await saveEmployeeAccess(user.id, result.value.roleId || null, []);
  }

  async function saveEmployeeAccess(userId: string, roleId: string | null, permissions: string[]) {
    try {
      dashboardLoading("Saving access…", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/users/${userId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, permissions }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save access.");
      setUserItems((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                assignedRoleId: roleId,
                roleStatus: roleId || permissions.length ? "assigned" : "unassigned",
              }
            : user,
        ),
      );
      if (selectedUserId === userId) {
        setSelectedRoleId(roleId ?? "");
        setSelectedPermissions(permissions);
        setLoadedFor(userId);
      }
      dashboardLoading.close();
      await dashboardSuccess("Access Updated", "Employee access has been updated successfully.");
    } catch (error) {
      dashboardLoading.close();
      await dashboardError("Access Update Failed", error instanceof Error ? error.message : "Could not save access.");
    }
  }

  async function removeEmployeeAccess(user: User) {
    const confirmed = await dashboardConfirm({
      title: "Remove employee access?",
      text: `${user.name ?? user.email} will lose role and direct permissions. They will see an access pending message after login.`,
      confirmButtonText: "Yes, Remove Access",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    await saveEmployeeAccess(user.id, null, []);
  }

  async function viewEmployeePermissions(user: User) {
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/permissions`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not load permissions.");
      const items = Array.isArray(payload?.data) ? payload.data : [];
      await Swal.fire(
        dashboardSwalOptions({
          title: "Employee Permissions",
          html: `<div class="max-h-80 overflow-y-auto text-left">${items.length ? items.map((item: string) => `<div class="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">${item}</div>`).join("") : "<p class='text-sm text-slate-600'>No permissions assigned.</p>"}</div>`,
          confirmButtonText: "Close",
        }),
      );
    } catch (error) {
      await dashboardError("Permission Load Failed", error instanceof Error ? error.message : "Could not load permissions.");
    }
  }

  function togglePermission(key: string) {
    setSelectedPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function toggleAll() {
    const visibleKeys = filteredPermissions.map((permission) => permission.key);
    const allVisibleChecked = visibleKeys.every((key) => selectedPermissions.includes(key));
    setSelectedPermissions((current) =>
      allVisibleChecked
        ? current.filter((key) => !visibleKeys.includes(key))
        : Array.from(new Set([...current, ...visibleKeys])),
    );
  }

  const allVisibleChecked =
    filteredPermissions.length > 0 &&
    filteredPermissions.every((permission) => selectedPermissions.includes(permission.key));

  const selectedRole = roleItems.find((role) => role.id === selectedRoleId);
  const selectedUser = userItems.find((user) => user.id === selectedUserId);
  const effectivePermissions = useMemo(() => {
    const fromRole = Array.isArray(selectedRole?.permissions) ? selectedRole!.permissions! : [];
    return Array.from(new Set([...(fromRole ?? []), ...selectedPermissions]));
  }, [selectedPermissions, selectedRole]);
  const accessPreview = useMemo(() => {
    const items = employeeNavigation.flatMap((group) => group.items);
    return items.filter((item) => effectivePermissions.includes(item.permission));
  }, [effectivePermissions]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {message ? <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">{message}</div> : null}

      {activeTab === "access" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Step 3</p>
            <h2 className="mt-2 text-xl font-semibold">Assign Employee Access</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Recommended: assign one role first. Use direct permissions only for special temporary access.</p>
            <select value={selectedUserId} onChange={(event) => selectEmployee(event.target.value)} className="mt-5 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm">
              {userItems.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
            <label className="mt-5 block text-sm">
              <span className="mb-2 block font-semibold">Role</span>
              <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm">
                <option value="">No role / access pending</option>
                {roleItems.filter((role) => !role.isSystem).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-bold">{selectedUser?.name ?? selectedUser?.email ?? "Selected employee"}</p>
              <p className="mt-1 text-blue-800">{selectedRole ? `Will use role: ${selectedRole.name}` : "No role selected. Add a role or direct permission before saving access."}</p>
            </div>
            <button type="button" onClick={() => void assignRoleAccess()} disabled={!selectedUserId || busy} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50">
              {busy ? "Saving..." : "Save Employee Access"}
            </button>
            <button
              type="button"
              onClick={() => selectedUser && void removeEmployeeAccess(selectedUser)}
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Remove Role & Permissions
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Optional exception access</p>
                <h2 className="mt-1 text-xl font-semibold">Direct Permissions</h2>
              </div>
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search permissions..." className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm lg:w-[360px]" />
            </div>
            {selectedUserId && loadedFor !== selectedUserId ? (
              <button type="button" onClick={() => void loadPermissions(selectedUserId)} className="mt-4 text-sm font-medium text-primary">
                Load current effective permissions
              </button>
            ) : null}

            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sidebar preview from role + exceptions</p>
              {accessPreview.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No sidebar links will be visible.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {accessPreview.map((item) => (
                    <li key={item.href}>{item.label}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Best practice: leave these unchecked unless this employee needs special access outside their role.
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[52px_220px_minmax(0,1fr)] border-b border-blue-100 bg-gradient-to-r from-white to-blue-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                <label className="flex items-center">
                  <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} />
                </label>
                <span>Permission</span>
                <span>Description</span>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {filteredPermissions.map((permission) => (
                  <label key={permission.id} className="grid cursor-pointer grid-cols-[52px_220px_minmax(0,1fr)] border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-secondary/20">
                    <span className="flex items-center">
                      <input type="checkbox" checked={selectedPermissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} />
                    </span>
                    <span className="font-medium">{titleCase(permission.key)}</span>
                    <span className="text-muted-foreground">
                      {permission.description ?? `Allows authorized users to ${titleCase(permission.action).toLowerCase()} ${titleCase(permission.resource).toLowerCase()}.`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : activeTab === "admins" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Step 4</p>
            <h2 className="mt-2 text-xl font-semibold">Admin Users Review</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review every employee and confirm who is assigned or still pending.</p>
          </div>
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <input value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} placeholder="Search employees..." className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm sm:max-w-md" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <TableHeader>
                <TableHeadRow>
                  <TableHeadCell>Employee</TableHeadCell>
                  <TableHeadCell>Email</TableHeadCell>
                  <TableHeadCell>Assigned Role</TableHeadCell>
                  <TableHeadCell>Access Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableHeadRow>
              </TableHeader>
              <tbody>
                {filteredUsers.map((user) => {
                  const assignedRole = roleItems.find((role) => role.id === user.assignedRoleId);
                  return (
                  <tr key={user.id} className="border-b border-border last:border-b-0 hover:bg-blue-50/40">
                    <td className="px-4 py-4 font-medium">{user.name ?? "Unnamed employee"}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">{assignedRole?.name ?? "Custom / no role"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.roleStatus === "assigned" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {user.roleStatus === "assigned" ? "Access assigned" : "Access pending"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void editEmployeeRole(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-950"><Edit3 className="h-3.5 w-3.5" /> Edit Role</button>
                        <button type="button" onClick={() => void viewEmployeePermissions(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100"><Eye className="h-3.5 w-3.5" /> View</button>
                        <button type="button" onClick={() => void removeEmployeeAccess(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === "permissions" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Step 2</p>
            <h2 className="mt-2 text-xl font-semibold">Role Permission Editor</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select a reusable role, then check or uncheck the dashboard links and actions it should unlock.</p>
          </div>
          <div className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-end lg:justify-between">
            <label className="block w-full max-w-md text-sm">
              <span className="mb-2 block font-semibold">Employee role</span>
              <select
                value={selectedRoleId}
                onChange={(event) => {
                  const roleId = event.target.value;
                  setSelectedRoleId(roleId);
                  setSelectedPermissions(roleItems.find((role) => role.id === roleId)?.permissions ?? []);
                }}
                className="h-12 w-full rounded-xl border border-input bg-background px-4"
              >
                <option value="">Select a role</option>
                {roleItems.filter((role) => !role.isSystem).map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <label className="block w-full max-w-md text-sm">
              <span className="mb-2 block font-semibold">Search permissions</span>
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search permission name, resource, action..." className="h-12 w-full rounded-xl border border-input bg-background px-4" />
            </label>
            <button type="button" onClick={() => void saveRolePermissions()} disabled={!selectedRoleId || busy} className="h-12 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-blue-950 disabled:opacity-50">
              {busy ? "Saving..." : "Save Role Permissions"}
            </button>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-5">
            <div className="space-y-3">
            {filteredPermissions.map((permission) => (
              <label key={permission.id} className="block cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
                <span className="flex items-start gap-4">
                  <input type="checkbox" checked={selectedPermissions.includes(permission.key)} onChange={() => togglePermission(permission.key)} className="mt-1 h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-950">{titleCase(permission.key)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-700">{permission.resource} · {permission.action}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{permission.description ?? "Controls access to this dashboard feature."}</p>
                  </span>
                  <span className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void editPermission(permission); }} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-950"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void deletePermission(permission); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </span>
                </span>
              </label>
            ))}
            {filteredPermissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted-foreground">
                No permissions match your search.
              </div>
            ) : null}
            </div>
          </div>
        </section>
      ) : activeTab === "security" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Step 5</p>
              <h2 className="mt-2 text-xl font-semibold">Security Logs</h2>
              <p className="mt-1 text-sm text-muted-foreground">Audit trail for role creation, permission changes, and employee access updates.</p>
            </div>
            <label className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={securitySearch}
                onChange={(event) => setSecuritySearch(event.target.value)}
                placeholder="Search logs..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-sm"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <TableHeader>
                <TableHeadRow>
                  <TableHeadCell>Time</TableHeadCell>
                  <TableHeadCell>Action</TableHeadCell>
                  <TableHeadCell>Details</TableHeadCell>
                  <TableHeadCell>By</TableHeadCell>
                  <TableHeadCell>Severity</TableHeadCell>
                </TableHeadRow>
              </TableHeader>
              <tbody>
                {filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No matching role or access security logs.</td>
                  </tr>
                ) : (
                  filteredAudit.slice(0, 100).map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-b-0 hover:bg-blue-50/40">
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Not provided"}</td>
                      <td className="px-4 py-4 font-semibold text-slate-950">{titleCase(log.action)}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{log.details ?? log.entityType ?? "Access activity"}</td>
                      <td className="px-4 py-4 text-sm">{log.performedBy ?? "system"}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{log.severity}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Step 1</p>
                <h2 className="mt-2 text-xl font-semibold">Roles</h2>
                <p className="mt-1 text-sm text-muted-foreground">Reusable job-based roles available for assignment.</p>
              </div>
              <button
                type="button"
                onClick={() => void createRole()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900"
              >
                <Plus className="h-4 w-4" /> Create Role
              </button>
            </div>
            <div className="border-b border-border p-5">
              <input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Search roles..." className="h-11 w-full max-w-md rounded-xl border border-input bg-background px-4 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <TableHeader>
                  <TableHeadRow>
                    <TableHeadCell>Role</TableHeadCell>
                    <TableHeadCell>Description</TableHeadCell>
                    <TableHeadCell>Permissions</TableHeadCell>
                    <TableHeadCell>Type</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                  </TableHeadRow>
                </TableHeader>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="border-b border-border last:border-b-0 hover:bg-blue-50/40">
                      <td className="px-4 py-4 font-semibold text-slate-950">{role.name}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{role.description ?? "No description"}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{role.permissions?.length ?? 0}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{role.isSystem ? "System" : "Custom"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void editRole(role)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-950"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                          <button type="button" onClick={() => void deleteRole(role)} disabled={role.isSystem} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
