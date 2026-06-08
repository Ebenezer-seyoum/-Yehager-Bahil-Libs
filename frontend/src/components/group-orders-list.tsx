"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { CreateGroupOrderModal } from "@/components/create-group-order-modal";

type GroupSummary = {
  id: string;
  groupName: string;
  productName?: string | null;
  productImage?: string | null;
  selectionType?: string | null;
  memberCount?: number;
  readyMemberCount?: number;
  inCart?: boolean;
  ordered?: boolean;
  paid?: boolean;
  currentStep?: number;
};

const steps = ["Choose outfit", "Add members", "Review & cart", "Payment"];

export function GroupOrdersList({ groups }: { groups: GroupSummary[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6">
          <Link href="/my-account" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Account
          </Link>
        </div>
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Private Shared Checkout</p>
            <h1 className="mt-2 font-heading text-5xl font-bold sm:text-6xl">Group Orders</h1>
            <p className="mt-3 text-lg text-muted-foreground">Manage family orders and continue from your last completed step.</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-black">
            <Plus className="h-5 w-5" /> Create Group Order
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border py-20 text-center">
            <Users className="mx-auto h-14 w-14 text-primary/50" />
            <h2 className="mt-5 font-heading text-3xl font-bold">No group orders yet</h2>
            <p className="mt-2 text-muted-foreground">Create a group, select an outfit, add members, and checkout together.</p>
            <button onClick={() => setCreateOpen(true)} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-black">Create Your First Group</button>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => {
              const step = Math.max(1, Number(group.currentStep ?? 1));
              const resumeTarget = step === 1 ? "shared-outfit" : step === 2 ? "members" : "checkout";
              return (
                <article key={group.id} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    {group.productImage ? <img src={group.productImage} alt="" className="h-28 w-24 rounded-xl object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-primary/10"><Users className="h-9 w-9 text-primary" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-heading text-3xl font-bold">{group.groupName}</h2>
                        {group.paid ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{group.productName || "No outfit selected"} · {group.memberCount ?? 0} members · {group.readyMemberCount ?? 0} ready</p>
                      <div className="mt-5 grid grid-cols-4 gap-2">
                        {steps.map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${index < step ? "bg-primary" : "bg-border"}`} /><p className="mt-2 hidden text-[10px] text-muted-foreground sm:block">{label}</p></div>)}
                      </div>
                    </div>
                    <Link href={`/family-group/${group.id}#${resumeTarget}`} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-black">
                      {group.paid ? "View Details" : "Continue Group Order"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {createOpen ? <CreateGroupOrderModal onClose={() => setCreateOpen(false)} /> : null}
    </>
  );
}
