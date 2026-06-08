"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  accountStatus?: string | null;
  roleStatus?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};

type DetailPayload = {
  user: User;
  profile: Record<string, unknown> | null;
  assignedRole: Record<string, unknown> | null;
  permissions: string[];
  activity: Array<Record<string, unknown>>;
  handledOrders: Array<Record<string, unknown>>;
};

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function accountTone(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800";
  if (s === "invited") return "bg-blue-100 text-blue-800";
  if (s === "inactive" || s === "blocked" || s === "pending" || s === "suspended") return "bg-blue-100 text-blue-800";
  if (s === "pending") return "bg-slate-100 text-slate-800";
  return "bg-slate-100 text-slate-800";
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
  mode = "all",
  canEdit = false,
  canDelete = false,
  canAssignRole = false,
}: {
  users: User[];
  query?: string;
  mode?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignRole?: boolean;
}) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const filteredUsers = normalizedQuery
    ? users.filter((user) => {
        const haystack = [user.name, user.email, user.role, user.accountStatus]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");
        return haystack.includes(normalizedQuery);
      })
    : users;

  const router = useRouter();

  function openEmployeeDetail(employeeId: string) {
    router.push(`/admin/users/employees/${employeeId}?tab=${encodeURIComponent(mode)}`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell className="w-14">No</TableHeadCell>
                <TableHeadCell>Profile Picture</TableHeadCell>
                <TableHeadCell>Employee Name</TableHeadCell>
                <TableHeadCell>Role</TableHeadCell>
                <TableHeadCell>Account Status</TableHeadCell>
                <TableHeadCell>Last Login</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-red-700">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <XCircle className="h-12 w-12 text-red-500" />
                      <div className="space-y-1 text-center">
                        <p className="text-base font-semibold text-red-700">
                          {mode === "active"
                            ? "No active employees found."
                            : mode === "inactive"
                              ? "No inactive employees found."
                              : mode === "unassigned"
                                ? "All employees have assigned roles."
                                : mode === "new"
                                  ? "No new employees found for this period."
                                  : "No employees found."}
                        </p>
                        <p className="text-sm text-red-600">Try a different search term or adjust your filters.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  return (
                    <tr key={user.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">{index + 1}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openEmployeeDetail(user.id)}
                          className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label={`View ${user.name ?? user.email} details`}
                        >
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name ?? user.email ?? "User"}
                              className="h-10 w-10 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-sm font-semibold">
                              {initials(user.name, user.email ?? "")}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openEmployeeDetail(user.id)}
                          className="block rounded-md text-left font-medium text-slate-950 hover:text-blue-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          {user.name ?? "Unnamed employee"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm capitalize">{user.role}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${accountTone(user.accountStatus)}`}>
                          {String(user.accountStatus ?? "—")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</td>
                      <td className="px-4 py-4">
                        <DashboardTableActions>
                          <DashboardActionButton action="view" onClick={() => void openEmployeeDetail(user.id)} />
                        </DashboardTableActions>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
