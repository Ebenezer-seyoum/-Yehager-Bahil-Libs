"use client";

import Link from "next/link";
import { useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmployeeDetailClient } from "@/components/admin/employee-detail-client";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<DetailPayload | null>(null);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);

  async function openEmployeeDetail(employeeId: string) {
    setDetailEmployeeId(employeeId);
    setDetailOpen(true);
    setDetailBusy(true);
    setDetailError(null);
    const quickUser = users.find((u) => u.id === employeeId) ?? null;
    if (quickUser) {
      setDetailPayload({
        user: quickUser,
        profile: null,
        assignedRole: null,
        permissions: [],
        activity: [],
        handledOrders: [],
      });
    } else {
      setDetailPayload(null);
    }
    try {
      const res = await fetch(`/api/backend/admin/users/${employeeId}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as { message?: string; data?: DetailPayload } | null;
      if (!res.ok) {
        throw new Error(String(json?.message ?? "Unable to load employee details. Please try again."));
      }
      setDetailPayload(json?.data ?? null);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load employee details. Please try again.");
    } finally {
      setDetailBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell>Profile Picture</TableHeadCell>
                <TableHeadCell>Employee Name</TableHeadCell>
                <TableHeadCell>Role</TableHeadCell>
                <TableHeadCell>Account Status</TableHeadCell>
                <TableHeadCell>Last Login</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {mode === "active"
                      ? "No active employees found."
                      : mode === "inactive"
                        ? "No inactive employees found."
                        : mode === "unassigned"
                          ? "All employees have assigned roles."
                          : mode === "new"
                            ? "No new employees found for this period."
                              : "No employees found."}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const viewHref = `/admin/users/employees/${user.id}?tab=${encodeURIComponent(mode)}`;
                  return (
                    <tr key={user.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4">
                        <Link href={viewHref} className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name ?? user.email}
                              className="h-10 w-10 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-sm font-semibold">
                              {initials(user.name, user.email)}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={viewHref} className="block font-medium">
                          {user.name ?? "Unnamed employee"}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm capitalize">{user.role}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${accountTone(user.accountStatus)}`}>
                          {String(user.accountStatus ?? "—")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openEmployeeDetail(user.id)}
                          className="inline-flex items-center rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={detailOpen} onOpenChange={(next) => { if (!next) { setDetailPayload(null); setDetailError(null); setDetailEmployeeId(null); } setDetailOpen(next); }}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="sr-only">Employee details</DialogTitle>
          <div className="max-h-[78vh] overflow-y-auto pr-1">
            {detailError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
                {detailError}
              </div>
            ) : detailPayload ? (
              <div className="space-y-3">
                {detailBusy ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-medium text-slate-700">
                    Loading latest details…
                  </div>
                ) : null}
                <EmployeeDetailClient
                  initialPayload={detailPayload}
                  backTab={mode}
                  canAssignRole={canAssignRole}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  embedded
                  onClose={() => setDetailOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
