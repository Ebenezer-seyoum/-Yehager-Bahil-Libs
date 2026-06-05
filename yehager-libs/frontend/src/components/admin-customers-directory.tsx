"use client";

import { useState } from "react";
import Link from "next/link";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomerDetailClient } from "@/components/admin/customer-detail-client";

type CustomerRow = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  customerType?: string | null;
  accountStatus?: string | null;
  avatarUrl?: string | null;
  profilePhotoUrl?: string | null;
  profile_photo_url?: string | null;
  createdAt?: string | null;
  totalOrders?: number | null;
  totalSpent?: number | null;
  lastOrderAt?: string | null;
};

type CustomerDetailResponse = {
  message?: string;
  data?: CustomerRow | { user?: CustomerRow | null };
};

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function accountTone(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800";
  if (s === "invited") return "bg-blue-100 text-blue-800";
  if (s === "inactive" || s === "blocked" || s === "suspended") return "bg-slate-100 text-slate-800";
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

export function AdminCustomersDirectory({
  tab,
  data,
  query,
}: {
  tab: string;
  data: AdminWorkspaceData;
  query: string;
}) {
  const customers = (data.users ?? []) as CustomerRow[];
  const orders = (data.orders ?? []) as Array<Record<string, unknown>>;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerRow | null>(null);

  async function openCustomerDetail(customerId: string) {
    setDetailOpen(true);
    setDetailBusy(true);
    setDetailError(null);
    const quick = customers.find((c) => c.id === customerId) ?? null;
    if (quick) setDetailCustomer(quick);
    try {
      const res = await fetch(`/api/backend/admin/users/${customerId}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as CustomerDetailResponse | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to load customer details. Please try again."));
      const user = json?.data && "user" in json.data ? json.data.user ?? null : json?.data ?? null;
      setDetailCustomer(user);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load customer details. Please try again.");
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
                <TableHeadCell>Customer Name</TableHeadCell>
                <TableHeadCell>Email</TableHeadCell>
                <TableHeadCell>Account Status</TableHeadCell>
                <TableHeadCell>Created Date</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {tab === "active"
                      ? "No active customers found."
                      : tab === "inactive"
                        ? "No inactive customers found."
                        : tab === "new"
                          ? "No new customers found for this period."
                          : tab === "top"
                            ? "No top customers found for this period."
                            : "No customers found."}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const viewHref = `/admin/customers/${customer.id}?tab=${encodeURIComponent(tab)}`;
                  const photoUrl =
                    customer.profile_photo_url ?? customer.profilePhotoUrl ?? customer.avatarUrl ?? null;
                  return (
                    <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-blue-50/40">
                      <td className="px-4 py-4">
                        <Link href={viewHref} className="flex items-center gap-3">
                          {photoUrl ? (
                            <img
                              src={String(photoUrl)}
                              alt={customer.name ?? customer.email}
                              className="h-10 w-10 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-sm font-semibold">
                              {initials(customer.name, customer.email)}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={viewHref} className="block font-medium">
                          {customer.name ?? "Unnamed customer"}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{customer.email}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${accountTone(customer.accountStatus)}`}>
                          {String(customer.accountStatus ?? "—")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{formatDate(customer.createdAt)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openCustomerDetail(customer.id)}
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

      <Dialog
        open={detailOpen}
        onOpenChange={(next) => {
          if (!next) {
            setDetailCustomer(null);
            setDetailError(null);
          }
          setDetailOpen(next);
        }}
      >
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <div className="bg-blue-950 px-6 py-4 pr-16 text-white">
            <DialogTitle className="text-lg font-bold text-white">Customer Detail</DialogTitle>
            <p className="mt-1 text-sm text-blue-100">View profile, address, account information, and customer order history.</p>
          </div>
          <div className="max-h-[78vh] overflow-y-auto bg-slate-50 p-5">
            {detailError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">{detailError}</div>
            ) : detailCustomer ? (
              <div className="space-y-3">
                {detailBusy ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-medium text-slate-700">
                    Loading latest details…
                  </div>
                ) : null}
                <CustomerDetailClient
                  initialCustomer={detailCustomer}
                  orders={orders}
                  backTab={tab}
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
