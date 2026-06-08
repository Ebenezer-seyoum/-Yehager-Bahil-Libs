"use client";

import { useRouter } from "next/navigation";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";

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
  const router = useRouter();

  function openCustomerDetail(customerId: string) {
    router.push(`/admin/customers/${customerId}?backTab=${encodeURIComponent(tab)}`);
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
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                customers.map((customer, index) => {
                  const photoUrl =
                    customer.profile_photo_url ?? customer.profilePhotoUrl ?? customer.avatarUrl ?? null;
                  return (
                    <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-blue-50/40">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">{index + 1}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openCustomerDetail(customer.id)}
                          className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
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
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openCustomerDetail(customer.id)}
                          className="block rounded-md text-left font-medium text-slate-950 hover:text-blue-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          {customer.name ?? "Unnamed customer"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{customer.email}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${accountTone(customer.accountStatus)}`}>
                          {String(customer.accountStatus ?? "—")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{formatDate(customer.createdAt)}</td>
                      <td className="px-4 py-4">
                        <DashboardTableActions>
                          <DashboardActionButton action="view" onClick={() => void openCustomerDetail(customer.id)} />
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
