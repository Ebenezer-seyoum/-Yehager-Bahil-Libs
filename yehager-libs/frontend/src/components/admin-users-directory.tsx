"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "suspended") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

function initials(name: string | null | undefined, email: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email.slice(0, 2).toUpperCase()
  );
}

export function AdminUsersDirectory({
  users,
  query,
}: {
  users: User[];
  query?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = users.length > 0 && selectedIds.length === users.length;

  const counts = useMemo(() => {
    const employees = users.filter((user) => user.role === "employee").length;
    const active = users.filter((user) => user.status === "active").length;
    const suspended = users.filter((user) => user.status === "suspended").length;
    const inactive = users.filter((user) => user.status === "inactive").length;
    return { employees, active, suspended, inactive };
  }, [users]);

  function toggleUser(userId: string) {
    setSelectedIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : users.map((user) => user.id));
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">All Users</h2>
              <p className="text-sm text-muted-foreground">Click a user to open the full profile and management actions.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                name="q"
                defaultValue={query ?? ""}
                placeholder="Search users..."
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-sm sm:w-72"
              />
              <button className="rounded-xl border border-border px-4 py-2 text-sm font-medium">Search</button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">
                Actions
              </button>
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">
                Columns
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-secondary/20">
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">
                  <input type="checkbox" aria-label="Select all users" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 font-semibold">No.</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const selected = selectedIds.includes(user.id);
                  return (
                    <tr key={user.id} className={`border-b border-border last:border-b-0 ${selected ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${user.name ?? user.email}`}
                          checked={selected}
                          onChange={() => toggleUser(user.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-4">
                        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                            {initials(user.name, user.email)}
                          </span>
                          <span>
                            <span className="block font-medium">{user.name ?? "Unnamed user"}</span>
                            <span className="block text-sm text-muted-foreground">{user.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm capitalize">{user.role}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(user.status)}`}>{user.status}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Directory Size", users.length, "All visible records", "from-slate-800 to-blue-700"],
          ["Staff Accounts", counts.employees, "Employee workspace users", "from-emerald-800 to-emerald-600"],
          ["Active Access", counts.active, "Can currently sign in", "from-cyan-800 to-sky-600"],
          ["Suspended", counts.suspended, "Access blocked", "from-rose-800 to-red-600"],
          ["Inactive", counts.inactive, "Needs review", "from-amber-700 to-orange-500"],
          ["Selected Rows", selectedIds.length, "Marked in this table", "from-violet-800 to-purple-600"],
        ].map(([label, value, helper, tone]) => (
          <div key={label} className={`rounded-3xl bg-gradient-to-br ${tone} p-5 text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/10`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">{label}</p>
            <p className="mt-5 text-3xl font-bold">{value}</p>
            <p className="mt-2 min-h-10 text-sm font-medium text-white/80">{helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
