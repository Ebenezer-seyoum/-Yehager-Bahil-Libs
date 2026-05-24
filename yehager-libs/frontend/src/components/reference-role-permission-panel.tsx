"use client";

import { useMemo, useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { employeeNavigation } from "@/lib/dashboard-navigation";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  roleStatus?: "unassigned" | "assigned";
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
}: {
  users: User[];
  permissions: Permission[];
  roles: Role[];
}) {
  const [activeTab, setActiveTab] = useState<"assign" | "create">("assign");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleItems, setRoleItems] = useState(roles);

  const filteredPermissions = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      [permission.key, permission.resource, permission.action, permission.description]
        .some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [filter, permissions]);

  const filteredRoles = useMemo(() => {
    const query = roleFilter.trim().toLowerCase();
    if (!query) return roleItems;
    return roleItems.filter((role) =>
      [role.name, role.key, role.description].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [roleFilter, roleItems]);

  async function loadPermissions(userId: string) {
    setSelectedUserId(userId);
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

  async function savePermissions() {
    if (!selectedUserId) return;
    setBusy(true);
    setMessage(null);
    try {
      await fetch(`/api/backend/admin/users/${selectedUserId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      setMessage("Permissions assigned successfully.");
    } catch {
      setMessage("Could not assign permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function assignRoleAccess() {
    if (!selectedUserId) {
      setMessage("Please select an employee.");
      return;
    }
    if (!selectedRoleId && selectedPermissions.length === 0) {
      setMessage("Please select at least one role or permission.");
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
      setMessage("Role assigned successfully.");
    } catch {
      setMessage("Could not assign role.");
    } finally {
      setBusy(false);
    }
  }

  async function createRole() {
    if (!roleName.trim()) return;
    setRoleBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/backend/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName, description: roleDescription }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Role creation failed");
      setRoleItems((current) => [...current, payload.data].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleName("");
      setRoleDescription("");
      setCreateOpen(false);
      setMessage("Role created successfully.");
    } catch {
      setMessage("Could not create role.");
    } finally {
      setRoleBusy(false);
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
      <div className="border-b border-border pb-4">
        <h1 className="font-heading text-3xl font-semibold">Assign Role</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveTab("assign")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            activeTab === "assign"
              ? "bg-slate-800 text-white shadow-md"
              : "border border-border bg-background text-muted-foreground hover:bg-blue-50 hover:text-foreground"
          }`}
        >
          Assign Roles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            activeTab === "create"
              ? "bg-slate-800 text-white shadow-md"
              : "border border-border bg-background text-muted-foreground hover:bg-blue-50 hover:text-foreground"
          }`}
        >
          User Roles List
        </button>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">{message}</div> : null}

      {activeTab === "assign" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Select User</h2>
            <select value={selectedUserId} onChange={(event) => void loadPermissions(event.target.value)} className="mt-5 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
            <label className="mt-5 block text-sm">
              <span className="mb-2 block font-semibold">Role</span>
              <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm">
                <option value="">Custom / no role</option>
                {roleItems.filter((role) => !role.isSystem).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => void assignRoleAccess()} disabled={!selectedUserId || busy} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Assign Roles
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRoleId("");
                setSelectedPermissions([]);
                setMessage(null);
              }}
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Reset
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-semibold">Role Assignment</h2>
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search roles..." className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm lg:w-[360px]" />
            </div>
            {selectedUserId && loadedFor !== selectedUserId ? (
              <button type="button" onClick={() => void loadPermissions(selectedUserId)} className="mt-4 text-sm font-medium text-primary">
                Load permissions
              </button>
            ) : null}

            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Access Preview</p>
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

            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[52px_220px_minmax(0,1fr)] border-b border-blue-100 bg-gradient-to-r from-white to-blue-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                <label className="flex items-center">
                  <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} />
                </label>
                <span>Role Name</span>
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
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold">Roles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage available Roles.</p>
          </div>
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <input value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} placeholder="Filter user types..." className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm sm:max-w-md" />
            <button type="button" onClick={() => setCreateOpen(true)} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
              + Add New Roles
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <TableHeader>
                <TableHeadRow>
                  <TableHeadCell>No.</TableHeadCell>
                  <TableHeadCell>Name</TableHeadCell>
                  <TableHeadCell>Created Date</TableHeadCell>
                  <TableHeadCell>Modified Date</TableHeadCell>
                  <TableHeadCell>Type</TableHeadCell>
                </TableHeadRow>
              </TableHeader>
              <tbody>
                {filteredRoles.map((role, index) => (
                  <tr key={role.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-4">{index + 1}</td>
                    <td className="px-4 py-4 font-medium">{role.name}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{new Date(role.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{new Date(role.updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{role.isSystem ? "System" : "Custom"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Add New User Type</h2>
                <p className="mt-1 text-sm text-muted-foreground">Enter a new user type name to add it.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-2xl text-muted-foreground">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block font-medium">Name</span>
                <input value={roleName} onChange={(event) => setRoleName(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4" />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-medium">Description</span>
                <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4" />
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => void createRole()} disabled={roleBusy} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
