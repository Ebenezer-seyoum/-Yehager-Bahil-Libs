"use client";

import { useEffect, useMemo, useState, type ComponentType, type PropsWithChildren } from "react";
import { Edit3, Eye, Trash2, Shield, ShieldAlert, Users, Store, Settings, Crown, Scissors, Briefcase, Shirt, Activity, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const TypedDialog = Dialog as ComponentType<PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>>;
const TypedDialogContent = DialogContent as ComponentType<PropsWithChildren<{ className?: string }>>;
import {
  DashboardModalFooter,
  DashboardModalFooterButton,
  DashboardModalScrollBody,
  DashboardModalTitleBar,
  dashboardModalPresets,
} from "@/components/admin/dashboard-modal";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { employeeNavigation } from "@/lib/dashboard-navigation";
import { dashboardConfirm, dashboardError, dashboardLoading, dashboardSuccess } from "@/lib/dashboard-swal";
import { isAssignableEmployeeRole } from "@/lib/admin/assignable-roles";

const ADMIN_ROLE_CREATE_EVENT = "admin-roles:create-role";

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

type RoleModalState = {
  mode: "create" | "edit";
  role?: Role;
  name: string;
  description: string;
  color: string;
  icon: string;
};

type PermissionModalState = {
  permission: Permission;
  key: string;
  resource: string;
  action: string;
  description: string;
};

type EmployeeRoleModalState = {
  user: User;
  roleId: string;
};

type EmployeePermissionsModalState = {
  user: User;
  permissions: string[];
  loading: boolean;
  error: string | null;
};

function titleCase(value: string) {
  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

const ROLE_COLORS: Record<string, string> = {
  blue: "bg-blue-600",
  rose: "bg-rose-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-600",
  indigo: "bg-indigo-600",
  cyan: "bg-cyan-600",
  slate: "bg-slate-700",
  purple: "bg-purple-600",
};

const ROLE_ICONS: Record<string, any> = {
  shield: Shield,
  "shield-alert": ShieldAlert,
  users: Users,
  store: Store,
  settings: Settings,
  crown: Crown,
  scissors: Scissors,
  briefcase: Briefcase,
  shirt: Shirt,
  activity: Activity,
};

export function ReferenceRolePermissionPanel({
  users,
  permissions,
  roles,
  audit,
  activeTab,
  search = "",
}: {
  users: User[];
  permissions: Permission[];
  roles: Role[];
  audit: AuditLog[];
  activeTab: string;
  search?: string;
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(users[0]?.assignedRoleId ?? "");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userItems, setUserItems] = useState(users);
  const [roleItems, setRoleItems] = useState(roles);
  const [permissionItems, setPermissionItems] = useState(permissions);
  const [roleModal, setRoleModal] = useState<RoleModalState | null>(null);
  const [permissionModal, setPermissionModal] = useState<PermissionModalState | null>(null);
  const [employeeRoleModal, setEmployeeRoleModal] = useState<EmployeeRoleModalState | null>(null);
  const [employeePermissionsModal, setEmployeePermissionsModal] = useState<EmployeePermissionsModalState | null>(null);
  const workspaceSearch = search.trim().toLowerCase();

  const filteredPermissions = useMemo(() => {
    const query = workspaceSearch;
    if (!query) return permissionItems;
    return permissionItems.filter((permission) =>
      [permission.key, permission.resource, permission.action, permission.description]
        .some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [permissionItems, workspaceSearch]);

  const filteredRoles = useMemo(() => {
    const query = workspaceSearch;
    if (!query) return roleItems;
    return roleItems.filter((role) =>
      [role.name, role.key, role.description].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [roleItems, workspaceSearch]);

  const filteredUsers = useMemo(() => {
    const query = workspaceSearch;
    if (!query) return userItems;
    return userItems.filter((user) =>
      [user.name, user.email, user.status, user.roleStatus].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [userItems, workspaceSearch]);

  const filteredAudit = useMemo(() => {
    const query = workspaceSearch;
    if (!query) return audit;
    return audit.filter((log) =>
      [log.action, log.category, log.severity, log.entityType, log.entityId, log.performedBy, log.details]
        .some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [audit, workspaceSearch]);

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

  function createRole() {
    setRoleModal({ mode: "create", name: "", description: "", color: "blue", icon: "shield" });
  }

  useEffect(() => {
    const openCreateRole = () => createRole();
    window.addEventListener(ADMIN_ROLE_CREATE_EVENT, openCreateRole);
    return () => window.removeEventListener(ADMIN_ROLE_CREATE_EVENT, openCreateRole);
  }, []);

  async function saveRoleModal() {
    if (!roleModal) return;
    const value = {
      name: roleModal.name.trim(),
      description: roleModal.description.trim(),
      color: roleModal.color.trim() || null,
      icon: roleModal.icon.trim() || null,
    };
    if (!value.name) {
      await dashboardError("Validation Error", "Role name is required.");
      return;
    }
    setMessage(null);
    try {
      dashboardLoading(roleModal.mode === "edit" ? "Updating role..." : "Creating role...", "Please wait a moment.");
      const response = await fetch(roleModal.mode === "edit" && roleModal.role ? `/api/backend/admin/roles/${roleModal.role.id}` : "/api/backend/admin/roles", {
        method: roleModal.mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? (roleModal.mode === "edit" ? "Could not update role." : "Role creation failed"));
      setRoleItems((current) =>
        roleModal.mode === "edit" && roleModal.role
          ? current.map((item) => (item.id === roleModal.role?.id ? { ...item, ...payload.data } : item))
          : [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMessage(roleModal.mode === "edit" ? "Role updated successfully." : "Role created successfully.");
      setRoleModal(null);
      dashboardLoading.close();
      await dashboardSuccess(roleModal.mode === "edit" ? "Role Updated" : "Role Created", roleModal.mode === "edit" ? "Role information has been updated successfully." : "New employee role has been created successfully.");
    } catch (error) {
      dashboardLoading.close();
      setMessage(roleModal.mode === "edit" ? "Could not update role." : "Could not create role.");
      await dashboardError(roleModal.mode === "edit" ? "Update Failed" : "Create Failed", error instanceof Error ? error.message : roleModal.mode === "edit" ? "Could not update role." : "Could not create role.");
    }
  }

  function editRole(role: Role) {
    setRoleModal({ mode: "edit", role, name: role.name, description: role.description ?? "", color: role.color ?? "blue", icon: role.icon ?? "shield" });
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

  function editPermission(permission: Permission) {
    setPermissionModal({
      permission,
      key: permission.key,
      resource: permission.resource,
      action: permission.action,
      description: permission.description ?? "",
    });
  }

  async function savePermissionModal() {
    if (!permissionModal) return;
    const value = {
      key: permissionModal.key.trim(),
      resource: permissionModal.resource.trim(),
      action: permissionModal.action.trim(),
      description: permissionModal.description.trim(),
    };
    if (!value.key || !value.resource || !value.action) {
      await dashboardError("Validation Error", "Key, resource, and action are required.");
      return;
    }
    try {
      dashboardLoading("Updating permission...", "Please wait a moment.");
      const response = await fetch(`/api/backend/admin/permissions/${permissionModal.permission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not update permission.");
      setPermissionItems((current) => current.map((item) => (item.id === permissionModal.permission.id ? payload.data : item)));
      setRoleItems((current) =>
        current.map((role) => ({
          ...role,
          permissions: role.permissions?.map((key) => (key === permissionModal.permission.key ? payload.data.key : key)),
        })),
      );
      setSelectedPermissions((current) => current.map((key) => (key === permissionModal.permission.key ? payload.data.key : key)));
      setPermissionModal(null);
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

  function editEmployeeRole(user: User) {
    setEmployeeRoleModal({ user, roleId: user.assignedRoleId ?? "" });
  }

  async function saveEmployeeRoleModal() {
    if (!employeeRoleModal) return;
    const userId = employeeRoleModal.user.id;
    const nextRoleId = employeeRoleModal.roleId || null;
    setEmployeeRoleModal(null);
    await saveEmployeeAccess(userId, nextRoleId, []);
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
    setEmployeePermissionsModal({ user, permissions: [], loading: true, error: null });
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/permissions`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not load permissions.");
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setEmployeePermissionsModal({ user, permissions: items, loading: false, error: null });
    } catch (error) {
      setEmployeePermissionsModal({
        user,
        permissions: [],
        loading: false,
        error: error instanceof Error ? error.message : "Could not load permissions.",
      });
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
    return items.filter((item) =>
      [item.permission, ...(item.alternativePermissions ?? [])].some((permission) =>
        effectivePermissions.includes(permission),
      ),
    );
  }, [effectivePermissions]);
  return (
    <>
    <div className="w-full space-y-5">
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
                {roleItems.filter(isAssignableEmployeeRole).map((role) => (
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
            <div className="border-b border-border pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Optional exception access</p>
                <h2 className="mt-1 text-xl font-semibold">Direct Permissions</h2>
              </div>
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
                    <li key={item.href}>
                      {item.label}
                      {item.children?.length ? (
                        <ul className="mt-1 list-[circle] space-y-1 pl-5 text-muted-foreground">
                          {item.children.map((child) => (
                            <li key={child.href}>{child.label}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
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
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
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
                {roleItems.filter(isAssignableEmployeeRole).map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void saveRolePermissions()} disabled={!selectedRoleId || busy} className="h-12 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-blue-950 disabled:opacity-50">
              {busy ? "Saving..." : "Save Role Permissions"}
            </button>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-5">
            <div className="space-y-6">
              {Array.from(
                filteredPermissions.reduce((acc, perm) => {
                  if (!acc.has(perm.resource)) acc.set(perm.resource, []);
                  acc.get(perm.resource).push(perm);
                  return acc;
                }, new Map())
              ).map(([resource, perms]) => {
                const standardMap: Record<string, string> = { create: 'CREATE', view: 'READ', edit: 'UPDATE', manage: 'UPDATE', delete: 'DELETE' };
                const grouped: Record<string, any> = { CREATE: null, READ: null, UPDATE: null, DELETE: null, OTHER: [] };
                for (const p of (perms as Permission[])) {
                  const std = standardMap[p.action];
                  if (std) {
                    if (!grouped[std]) grouped[std] = p;
                    else grouped.OTHER.push(p);
                  } else {
                    grouped.OTHER.push(p);
                  }
                }
                
                return (
                  <div key={resource as string} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {titleCase(resource as string)} Module
                      </h3>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => {
                          const keys = (perms as Permission[]).map(p => p.key);
                          setSelectedPermissions(curr => Array.from(new Set([...curr, ...keys])));
                        }} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Select All</button>
                        <button type="button" onClick={() => {
                          const keys = (perms as Permission[]).map(p => p.key);
                          setSelectedPermissions(curr => curr.filter(k => !keys.includes(k)));
                        }} className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">Deselect All</button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs w-[30%]">Permission</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs text-center">Create</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs text-center">Read</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs text-center">Update</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs text-center">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-5 py-4 font-medium text-slate-700 flex items-center gap-2">
                              Base Access
                            </td>
                            <td className="px-5 py-4 text-center">
                              {grouped.CREATE ? (
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedPermissions.includes(grouped.CREATE.key)} onChange={() => togglePermission(grouped.CREATE.key)} />
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {grouped.READ ? (
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedPermissions.includes(grouped.READ.key)} onChange={() => togglePermission(grouped.READ.key)} />
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {grouped.UPDATE ? (
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedPermissions.includes(grouped.UPDATE.key)} onChange={() => togglePermission(grouped.UPDATE.key)} />
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {grouped.DELETE ? (
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={selectedPermissions.includes(grouped.DELETE.key)} onChange={() => togglePermission(grouped.DELETE.key)} />
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                          </tr>
                          {grouped.OTHER.map((p: any) => (
                            <tr key={p.id}>
                              <td className="px-5 py-4 font-medium text-slate-700 flex items-center justify-between">
                                {titleCase(p.action)}
                              </td>
                              <td colSpan={4} className="px-5 py-4">
                                <label className="flex items-center gap-3 cursor-pointer w-fit">
                                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedPermissions.includes(p.key)} onChange={() => togglePermission(p.key)} />
                                  <span className="text-slate-600 text-xs font-medium">{p.description || "Custom module action"}</span>
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {filteredPermissions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted-foreground">
                  No permissions match your search.
                </div>
              )}
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRoles.map((role) => {
              const bgClass = ROLE_COLORS[role.color || "blue"] || ROLE_COLORS.slate;
              const IconComp = ROLE_ICONS[role.icon || "shield"] || Shield;
              const usersCount = userItems.filter(u => u.assignedRoleId === role.id).length;

              return (
                <div key={role.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                  <div className={`p-5 relative ${bgClass}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm shadow-inner">
                        <IconComp className="h-6 w-6" />
                      </div>
                      {role.isSystem && (
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-extrabold tracking-wider text-white backdrop-blur-sm shadow-sm">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">{role.name}</h3>
                    <p className="mt-1 text-sm text-white/90 line-clamp-2">{role.description || "No description provided."}</p>
                  </div>
                  
                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-5 text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-slate-400" />
                        {usersCount} {usersCount === 1 ? "User" : "Users"}
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4.5 w-4.5 text-slate-400" />
                        {role.permissions?.length ?? 0} Permissions
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">KEY PERMISSIONS</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {role.permissions?.slice(0, 3).map((perm) => (
                          <span key={perm} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                            {titleCase(perm)}
                          </span>
                        ))}
                        {(role.permissions?.length ?? 0) > 3 && (
                          <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                            +{(role.permissions?.length ?? 0) - 3} more
                          </span>
                        )}
                        {(!role.permissions || role.permissions.length === 0) && (
                          <span className="text-sm text-slate-400 font-medium">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-2">
                    <button type="button" onClick={() => void editRole(role)} className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                      <Edit3 className="h-4 w-4" /> Edit Role
                    </button>
                    <div className="h-5 w-px bg-slate-200"></div>
                    <button type="button" onClick={() => void deleteRole(role)} disabled={role.isSystem} className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 disabled:hover:bg-transparent">
                      <Trash2 className="h-4 w-4" /> Delete Role
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>

    <TypedDialog open={Boolean(roleModal)} onOpenChange={(open) => !open && setRoleModal(null)}>
      <TypedDialogContent className={dashboardModalPresets.simple.content()}>
        <DashboardModalTitleBar
          title={roleModal?.mode === "edit" ? "Edit Role" : "Create New Role"}
          description={roleModal?.mode === "edit" ? "Update role name and description." : "Create a reusable employee role for dashboard access."}
          variant="compact"
        />
        <DashboardModalScrollBody variant="compact">
          <div className="space-y-5">
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">Role Name</span>
              <input
                value={roleModal?.name ?? ""}
                onChange={(event) => setRoleModal((current) => current ? { ...current, name: event.target.value } : current)}
                placeholder="e.g. Custom Design Reviewer"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Color Profile</span>
                <select
                  value={roleModal?.color ?? "blue"}
                  onChange={(event) => setRoleModal((current) => current ? { ...current, color: event.target.value } : current)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {Object.keys(ROLE_COLORS).map(color => (
                    <option key={color} value={color}>{titleCase(color)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">Icon</span>
                <select
                  value={roleModal?.icon ?? "shield"}
                  onChange={(event) => setRoleModal((current) => current ? { ...current, icon: event.target.value } : current)}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {Object.keys(ROLE_ICONS).map(icon => (
                    <option key={icon} value={icon}>{titleCase(icon)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">Description</span>
              <textarea
                value={roleModal?.description ?? ""}
                onChange={(event) => setRoleModal((current) => current ? { ...current, description: event.target.value } : current)}
                rows={4}
                placeholder="What should this employee role manage?"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
          </div>
        </DashboardModalScrollBody>
        <DashboardModalFooter variant="compact">
          <DashboardModalFooterButton size="sm" onClick={() => setRoleModal(null)}>Cancel</DashboardModalFooterButton>
          <DashboardModalFooterButton variant="primary" size="sm" onClick={() => void saveRoleModal()}>
            {roleModal?.mode === "edit" ? "Save Changes" : "Create Role"}
          </DashboardModalFooterButton>
        </DashboardModalFooter>
      </TypedDialogContent>
    </TypedDialog>

    <TypedDialog open={Boolean(permissionModal)} onOpenChange={(open) => !open && setPermissionModal(null)}>
      <TypedDialogContent className={dashboardModalPresets.compact.content()}>
        <DashboardModalTitleBar
          title="Edit Permission"
          description="Update the permission key, resource, action, and dashboard description."
          variant="compact"
        />
        <DashboardModalScrollBody variant="compact">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-2 block font-semibold text-slate-700">Permission Key</span>
              <input
                value={permissionModal?.key ?? ""}
                onChange={(event) => setPermissionModal((current) => current ? { ...current, key: event.target.value } : current)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">Resource</span>
              <input
                value={permissionModal?.resource ?? ""}
                onChange={(event) => setPermissionModal((current) => current ? { ...current, resource: event.target.value } : current)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">Action</span>
              <input
                value={permissionModal?.action ?? ""}
                onChange={(event) => setPermissionModal((current) => current ? { ...current, action: event.target.value } : current)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-2 block font-semibold text-slate-700">Description</span>
              <textarea
                value={permissionModal?.description ?? ""}
                onChange={(event) => setPermissionModal((current) => current ? { ...current, description: event.target.value } : current)}
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </label>
          </div>
        </DashboardModalScrollBody>
        <DashboardModalFooter variant="compact">
          <DashboardModalFooterButton size="sm" onClick={() => setPermissionModal(null)}>Cancel</DashboardModalFooterButton>
          <DashboardModalFooterButton variant="primary" size="sm" onClick={() => void savePermissionModal()}>Save Changes</DashboardModalFooterButton>
        </DashboardModalFooter>
      </TypedDialogContent>
    </TypedDialog>

    <TypedDialog open={Boolean(employeeRoleModal)} onOpenChange={(open) => !open && setEmployeeRoleModal(null)}>
      <TypedDialogContent className={dashboardModalPresets.simple.content()}>
        <DashboardModalTitleBar
          title="Edit Employee Role"
          description={employeeRoleModal?.user.name ?? employeeRoleModal?.user.email ?? "Assign a reusable role to this employee."}
          variant="compact"
        />
        <DashboardModalScrollBody variant="compact">
          <label className="block text-sm">
            <span className="mb-2 block font-semibold text-slate-700">Employee Role</span>
            <select
              value={employeeRoleModal?.roleId ?? ""}
              onChange={(event) => setEmployeeRoleModal((current) => current ? { ...current, roleId: event.target.value } : current)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">No role / access pending</option>
              {roleItems.filter(isAssignableEmployeeRole).map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </label>
        </DashboardModalScrollBody>
        <DashboardModalFooter variant="compact">
          <DashboardModalFooterButton size="sm" onClick={() => setEmployeeRoleModal(null)}>Cancel</DashboardModalFooterButton>
          <DashboardModalFooterButton variant="primary" size="sm" onClick={() => void saveEmployeeRoleModal()}>Save Role</DashboardModalFooterButton>
        </DashboardModalFooter>
      </TypedDialogContent>
    </TypedDialog>

    <TypedDialog open={Boolean(employeePermissionsModal)} onOpenChange={(open) => !open && setEmployeePermissionsModal(null)}>
      <TypedDialogContent className={dashboardModalPresets.scrollable.content()}>
        <DashboardModalTitleBar
          title="Employee Permissions"
          description={employeePermissionsModal?.user.name ?? employeePermissionsModal?.user.email ?? "View effective employee permissions."}
          variant="detail"
        />
        <DashboardModalScrollBody hasFooter={false} variant="detail">
          {employeePermissionsModal?.loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-700">Loading permissions...</div>
          ) : employeePermissionsModal?.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">{employeePermissionsModal.error}</div>
          ) : employeePermissionsModal?.permissions.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {employeePermissionsModal.permissions.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600">
              No permissions assigned.
            </div>
          )}
        </DashboardModalScrollBody>
      </TypedDialogContent>
    </TypedDialog>
    </>
  );
}
