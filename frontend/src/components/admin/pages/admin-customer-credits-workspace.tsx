"use client";

import { useMemo, useState } from "react";
import { Save, Settings, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type CreditCustomer = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  balanceUsd?: string | number | null;
  totalEarnedUsd?: string | number | null;
  totalUsedUsd?: string | number | null;
  lastEarnedAt?: string | Date | null;
  lastUsedAt?: string | Date | null;
  lastActivityAt?: string | Date | null;
  ledgerCount?: number | string | null;
  statusLabel?: string | null;
};

type CreditRule = {
  id?: string | null;
  name?: string | null;
  minimumPaidUsd?: string | number | null;
  rewardUsd?: string | number | null;
  appliesTo?: string | null;
  status?: string | null;
  internalNote?: string | null;
  updatedAt?: string | Date | null;
};

type LedgerEntry = {
  id?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
  amountUsd?: string | number | null;
  balanceAfterUsd?: string | number | null;
  type?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt?: string | Date | null;
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function dateLabel(value: unknown) {
  if (!value) return "No activity";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function typeLabel(value: unknown) {
  if (value === "bonus_credit") return "Bonus Credit";
  if (value === "credit_used") return "Credit Used";
  return String(value ?? "Credit").replaceAll("_", " ");
}

function appliesToLabel(value: unknown) {
  if (value === "catalog_orders") return "Catalog Orders";
  if (value === "custom_orders") return "Custom Orders";
  return "All Orders";
}

function RuleForm({
  rule,
  onSaved,
}: {
  rule: CreditRule | null;
  onSaved: (rule: CreditRule) => void;
}) {
  const [name, setName] = useState(String(rule?.name ?? ""));
  const [minimumPaidUsd, setMinimumPaidUsd] = useState(String(rule?.minimumPaidUsd ?? "500"));
  const [rewardUsd, setRewardUsd] = useState(String(rule?.rewardUsd ?? "30"));
  const [appliesTo, setAppliesTo] = useState(String(rule?.appliesTo ?? "all_orders"));
  const [status, setStatus] = useState(String(rule?.status ?? "active"));
  const [internalNote, setInternalNote] = useState(String(rule?.internalNote ?? ""));
  const [busy, setBusy] = useState(false);

  async function saveRule() {
    setBusy(true);
    try {
      const response = await fetch("/api/backend/admin/customer-credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: rule?.id ?? null,
          name: name || null,
          minimumPaidUsd: Number(minimumPaidUsd),
          rewardUsd: Number(rewardUsd),
          appliesTo,
          status,
          internalNote: internalNote || null,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not save credit rule");
      onSaved(json.data as CreditRule);
      await dashboardSuccess("Credit Rule Saved", "Future qualifying paid orders will use this bonus credit rule.");
    } catch (error) {
      await dashboardError("Save Failed", error instanceof Error ? error.message : "Could not save credit rule.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-4 w-4 text-emerald-800" />
        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-900">Manage Credit Rules</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <label className="md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Rule Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Spend $500, earn $30" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" />
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Paid Amount</span>
          <input type="number" value={minimumPaidUsd} onChange={(event) => setMinimumPaidUsd(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" />
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Credit Reward</span>
          <input type="number" value={rewardUsd} onChange={(event) => setRewardUsd(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none" />
        </label>
        <label>
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Applies To</span>
          <select value={appliesTo} onChange={(event) => setAppliesTo(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none">
            <option value="all_orders">All Orders</option>
            <option value="catalog_orders">Catalog Orders</option>
            <option value="custom_orders">Custom Orders</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Internal note, for example: automatic loyalty bonus for high-value orders" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" disabled={busy} onClick={() => void saveRule()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-60">
          <Save className="h-4 w-4" />
          Save Rule
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-emerald-900">
        Example: when a customer pays {money(minimumPaidUsd)}, the system automatically adds {money(rewardUsd)} store credit after payment is confirmed.
      </p>
    </section>
  );
}

export function AdminCustomerCreditsWorkspace({ data, canManage = false }: { data: AdminWorkspaceData; canManage?: boolean }) {
  const router = useRouter();
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [activeRule, setActiveRule] = useState<CreditRule | null>((data.activeCreditRule as CreditRule | null) ?? null);
  const [rules, setRules] = useState<CreditRule[]>((data.creditRules ?? []) as CreditRule[]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const customers = (data.creditCustomers ?? []) as CreditCustomer[];
  const ledgerEntries = (data.ledgerEntries ?? []) as LedgerEntry[];

  const selectedCustomer = customers.find((customer) => customer.email === selectedEmail) ?? null;
  const selectedLedger = selectedCustomer ? ledgerEntries.filter((entry) => entry.userEmail === selectedCustomer.email) : [];

  function handleRuleSaved(rule: CreditRule) {
    setActiveRule(rule.status === "active" ? rule : null);
    setRules((items) => [rule, ...items.filter((item) => item.id !== rule.id)]);
    router.refresh();
  }

  return (
    <AdminWorkspace
      pageId="customer-credits"
      initialData={{ ...data, creditRules: rules, activeCreditRule: activeRule }}
      hideKpis
      title="Customer Credit Ledger"
      subtitle="Track automatic bonus credits, customer balances, and future store-credit usage."
      icon={Wallet}
      defaultTab="customers"
      actions={canManage ? (
        <button type="button" onClick={() => setShowRuleForm((value) => !value)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-900 active:scale-95">
          <Settings className="h-4 w-4" />
          Manage Credit Rules
        </button>
      ) : null}
    >
      {({ activeTab, search }) => {
        const q = search.trim().toLowerCase();
        const visibleCustomers = customers.filter((customer) => [customer.name, customer.email, customer.phone, customer.statusLabel].join(" ").toLowerCase().includes(q));
        const visibleLedger = ledgerEntries.filter((entry) => [entry.customerName, entry.userEmail, entry.orderNumber, entry.reason, entry.type].join(" ").toLowerCase().includes(q));

        return (
          <div className="space-y-5">
            {showRuleForm && canManage ? <RuleForm rule={activeRule} onSaved={handleRuleSaved} /> : null}

            {activeRule ? (
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-bold text-slate-700">
                Active rule: customers who pay at least <span className="text-emerald-800">{money(activeRule.minimumPaidUsd)}</span> earn <span className="text-emerald-800">{money(activeRule.rewardUsd)}</span> store credit on {appliesToLabel(activeRule.appliesTo).toLowerCase()}.
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                No active credit rule is configured. Future paid orders will not earn bonus store credit until a rule is activated.
              </div>
            )}

            {activeTab === "rules" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <TableHeader>
                    <TableHeadRow>
                      <TableHeadCell>Rule</TableHeadCell>
                      <TableHeadCell>Paid Amount</TableHeadCell>
                      <TableHeadCell>Credit Reward</TableHeadCell>
                      <TableHeadCell>Applies To</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell>Updated</TableHeadCell>
                    </TableHeadRow>
                  </TableHeader>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map((rule) => (
                      <tr key={rule.id ?? rule.name} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-black text-slate-950">{rule.name}</td>
                        <td className="px-5 py-4 font-bold">{money(rule.minimumPaidUsd)}</td>
                        <td className="px-5 py-4 font-bold text-emerald-800">{money(rule.rewardUsd)}</td>
                        <td className="px-5 py-4 font-bold">{appliesToLabel(rule.appliesTo)}</td>
                        <td className="px-5 py-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase">{rule.status}</span></td>
                        <td className="px-5 py-4 font-bold text-slate-500">{dateLabel(rule.updatedAt)}</td>
                      </tr>
                    ))}
                    {!rules.length ? <tr><td colSpan={6} className="px-5 py-14 text-center text-sm font-bold text-slate-400">No credit rules configured.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === "ledger" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <TableHeader>
                    <TableHeadRow>
                      <TableHeadCell>Customer</TableHeadCell>
                      <TableHeadCell>Type</TableHeadCell>
                      <TableHeadCell>Amount</TableHeadCell>
                      <TableHeadCell>Balance After</TableHeadCell>
                      <TableHeadCell>Order</TableHeadCell>
                      <TableHeadCell>Reason</TableHeadCell>
                      <TableHeadCell>Date</TableHeadCell>
                    </TableHeadRow>
                  </TableHeader>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLedger.map((entry) => (
                      <tr key={entry.id ?? `${entry.userEmail}-${entry.createdAt}`} className="hover:bg-slate-50">
                        <td className="px-5 py-4"><p className="font-black">{entry.customerName || "Customer"}</p><p className="text-xs font-bold text-slate-500">{entry.userEmail}</p></td>
                        <td className="px-5 py-4 font-bold">{typeLabel(entry.type)}</td>
                        <td className={`px-5 py-4 font-black ${Number(entry.amountUsd) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(entry.amountUsd)}</td>
                        <td className="px-5 py-4 font-bold">{money(entry.balanceAfterUsd)}</td>
                        <td className="px-5 py-4 font-mono text-xs font-black">{entry.orderNumber ?? "—"}</td>
                        <td className="px-5 py-4 font-semibold text-slate-600">{entry.reason}</td>
                        <td className="px-5 py-4 font-bold text-slate-500">{dateLabel(entry.createdAt)}</td>
                      </tr>
                    ))}
                    {!visibleLedger.length ? <tr><td colSpan={7} className="px-5 py-14 text-center text-sm font-bold text-slate-400">No credit ledger entries match this view.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === "customers" ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full min-w-[1020px] text-left text-sm">
                    <TableHeader>
                      <TableHeadRow>
                        <TableHeadCell>Customer</TableHeadCell>
                        <TableHeadCell>Current Balance</TableHeadCell>
                        <TableHeadCell>Total Earned</TableHeadCell>
                        <TableHeadCell>Total Used</TableHeadCell>
                        <TableHeadCell>Last Credit Earned</TableHeadCell>
                        <TableHeadCell>Last Credit Used</TableHeadCell>
                        <TableHeadCell>Status</TableHeadCell>
                        <TableHeadCell>Actions</TableHeadCell>
                      </TableHeadRow>
                    </TableHeader>
                    <tbody className="divide-y divide-slate-100">
                      {visibleCustomers.map((customer) => (
                        <tr key={customer.id ?? customer.email} className="hover:bg-slate-50">
                          <td className="px-5 py-4"><p className="font-black text-slate-950">{customer.name || "Customer"}</p><p className="text-xs font-bold text-slate-500">{customer.email}</p></td>
                          <td className="px-5 py-4 text-lg font-black text-emerald-800">{money(customer.balanceUsd)}</td>
                          <td className="px-5 py-4 font-bold">{money(customer.totalEarnedUsd)}</td>
                          <td className="px-5 py-4 font-bold">{money(customer.totalUsedUsd)}</td>
                          <td className="px-5 py-4 font-bold text-slate-500">{dateLabel(customer.lastEarnedAt)}</td>
                          <td className="px-5 py-4 font-bold text-slate-500">{dateLabel(customer.lastUsedAt)}</td>
                          <td className="px-5 py-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase">{customer.statusLabel}</span></td>
                          <td className="px-5 py-4">
                            <DashboardTableActions>
                              <DashboardActionButton action="view" onClick={() => setSelectedEmail(customer.email ?? null)} />
                            </DashboardTableActions>
                          </td>
                        </tr>
                      ))}
                      {!visibleCustomers.length ? <tr><td colSpan={8} className="px-5 py-14 text-center text-sm font-bold text-slate-400">No customers match this view.</td></tr> : null}
                    </tbody>
                  </table>
                </div>

                {selectedCustomer ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Customer Credit Detail</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">{selectedCustomer.name || "Customer"}</h3>
                        <p className="text-sm font-bold text-slate-500">{selectedCustomer.email}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Current Balance</p>
                        <p className="text-2xl font-black text-emerald-900">{money(selectedCustomer.balanceUsd)}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Total Earned</p><p className="mt-1 text-lg font-black">{money(selectedCustomer.totalEarnedUsd)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Total Used</p><p className="mt-1 text-lg font-black">{money(selectedCustomer.totalUsedUsd)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Last Earned</p><p className="mt-1 text-sm font-black">{dateLabel(selectedCustomer.lastEarnedAt)}</p></div>
                      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Last Used</p><p className="mt-1 text-sm font-black">{dateLabel(selectedCustomer.lastUsedAt)}</p></div>
                    </div>
                    <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {selectedLedger.slice(0, 8).map((entry) => (
                        <div key={entry.id ?? String(entry.createdAt)} className="grid gap-2 p-4 text-sm md:grid-cols-[150px_120px_1fr_180px]">
                          <span className="font-black">{typeLabel(entry.type)}</span>
                          <span className={Number(entry.amountUsd) >= 0 ? "font-black text-emerald-700" : "font-black text-rose-700"}>{money(entry.amountUsd)}</span>
                          <span className="font-semibold text-slate-600">{entry.reason}</span>
                          <span className="font-bold text-slate-500">{dateLabel(entry.createdAt)}</span>
                        </div>
                      ))}
                      {!selectedLedger.length ? <div className="p-6 text-center text-sm font-bold text-slate-400">No credit activity for this customer yet.</div> : null}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
