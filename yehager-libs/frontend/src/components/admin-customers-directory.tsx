"use client";

import Link from "next/link";
import { useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";

type Customer = {
  id: string;
  name?: string | null;
  email: string;
  status: string;
  totalOrders: number;
  totalSpent: number;
};

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
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

export function AdminCustomersDirectory({
  customers,
  query: externalQuery,
}: {
  customers: Customer[];
  query?: string;
}) {
  const [localSearch, setLocalSearch] = useState("");
  const search = externalQuery ?? localSearch;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const filtered = customers.filter((customer) =>
    [customer.name, customer.email, customer.status].some((value) =>
      String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );
  const allSelected = filtered.length > 0 && filtered.every((customer) => selectedIds.includes(customer.id));

  function toggleCustomer(customerId: string) {
    setSelectedIds((current) => (current.includes(customerId) ? current.filter((id) => id !== customerId) : [...current, customerId]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : filtered.map((customer) => customer.id));
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">All Customers</h2>
            <p className="text-sm text-muted-foreground">Click a customer to open the full profile and management actions.</p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {externalQuery === undefined ? (
              <input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Search customers..."
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm lg:max-w-sm"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">Actions</button>
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">Columns</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell>
                  <input type="checkbox" aria-label="Select all customers" checked={allSelected} onChange={toggleAll} />
                </TableHeadCell>
                <TableHeadCell>No.</TableHeadCell>
                <TableHeadCell>Customer</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Orders</TableHeadCell>
                <TableHeadCell>Total Spent</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No customers found.</td></tr>
              ) : filtered.map((customer, index) => (
                <tr key={customer.id} className={selectedIds.includes(customer.id) ? "bg-primary/5" : ""}>
                  <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} /></td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{initials(customer.name, customer.email)}</span>
                      <span><span className="block font-medium">{customer.name ?? "Unnamed customer"}</span><span className="block text-sm text-muted-foreground">{customer.email}</span></span>
                    </Link>
                  </td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(customer.status)}`}>{customer.status}</span></td>
                  <td className="px-4 py-4 font-medium">{customer.totalOrders}</td>
                  <td className="px-4 py-4 font-medium text-primary">{formatCurrency(customer.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
