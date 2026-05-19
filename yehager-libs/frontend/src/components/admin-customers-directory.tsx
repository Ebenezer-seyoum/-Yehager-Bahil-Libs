"use client";

import Link from "next/link";
import { useState } from "react";

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

export function AdminCustomersDirectory({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const filtered = customers.filter((customer) =>
    [customer.name, customer.email, customer.status].some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())),
  );
  const allSelected = filtered.length > 0 && filtered.every((customer) => selectedIds.includes(customer.id));
  const active = customers.filter((customer) => customer.status === "active").length;
  const suspended = customers.filter((customer) => customer.status === "suspended").length;
  const inactive = customers.filter((customer) => customer.status === "inactive").length;
  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0);
  const totalSpent = customers.reduce((sum, customer) => sum + Number(customer.totalSpent ?? 0), 0);

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
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm lg:max-w-sm" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">Actions</button>
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium">Columns</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead className="bg-secondary/20">
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3"><input type="checkbox" aria-label="Select all customers" checked={allSelected} onChange={toggleAll} /></th>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total Spent</th>
              </tr>
            </thead>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Customer Directory", customers.length, "Total customer accounts", "from-slate-800 to-blue-700"],
          ["Active Customers", active, "Can currently sign in", "from-emerald-800 to-emerald-600"],
          ["Suspended", suspended, "Access blocked", "from-rose-800 to-red-600"],
          ["Inactive", inactive, "Needs review", "from-amber-700 to-orange-500"],
          ["Total Orders", totalOrders, "Orders from customers", "from-cyan-800 to-sky-600"],
          ["Customer Revenue", formatCurrency(totalSpent), "Total customer spend", "from-violet-800 to-purple-600"],
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
