"use client";

import { useMemo, useState } from "react";

type User = { id: string; name?: string | null; email: string; status: string };
type Permission = { id: string; key: string; resource: string; action: string };

export function EmployeePermissionsPanel({ employees, permissions }: { employees: User[]; permissions: Permission[] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(employees[0]?.id ?? null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = employees.filter((employee) =>
    [employee.name, employee.email].some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase())),
  );
  const selected = employees.find((employee) => employee.id === selectedId);
  const groups = useMemo(
    () =>
      permissions.reduce<Record<string, Permission[]>>((map, permission) => {
        map[permission.resource] ??= [];
        map[permission.resource].push(permission);
        return map;
      }, {}),
    [permissions],
  );

  async function selectEmployee(id: string) {
    setSelectedId(id);
    setBusy(true);
    const response = await fetch(`/api/backend/admin/users/${id}/permissions`);
    const payload = await response.json();
    setSelectedPermissions(Array.isArray(payload?.data) ? payload.data : []);
    setLoadedFor(id);
    setBusy(false);
  }

  async function savePermissions() {
    if (!selectedId) return;
    setBusy(true);
    await fetch(`/api/backend/admin/users/${selectedId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: selectedPermissions }),
    });
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Employee list</p>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="mt-3 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" />
        <div className="mt-3 space-y-2">
          {filtered.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => void selectEmployee(employee.id)}
              className={`w-full rounded-xl border p-3 text-left ${selectedId === employee.id ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <p className="font-medium">{employee.name ?? "Unnamed employee"}</p>
              <p className="text-xs text-muted-foreground">{employee.email}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Assign permissions</p>
            <p className="text-xs text-muted-foreground">{selected?.email ?? "Choose an employee"}</p>
          </div>
          <button onClick={() => void savePermissions()} disabled={!selectedId || busy} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            Save
          </button>
        </div>
        {selectedId && loadedFor !== selectedId ? <button onClick={() => void selectEmployee(selectedId)} className="mt-4 text-sm text-primary">Load permissions</button> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(groups).map(([resource, items]) => (
            <fieldset key={resource} className="rounded-xl border border-border p-3">
              <legend className="px-1 text-sm font-semibold capitalize">{resource}</legend>
              <div className="mt-2 space-y-2">
                {items.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.key)}
                      onChange={(event) =>
                        setSelectedPermissions((current) =>
                          event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key),
                        )
                      }
                    />
                    {permission.key}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
    </div>
  );
}
