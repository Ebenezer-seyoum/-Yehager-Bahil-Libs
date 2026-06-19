"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, CalendarClock, ClipboardList, FileText, Target, TicketPercent } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";

export type CouponDiscountDetailKind = "coupons" | "discounts";

export type CouponDiscountRow = {
  id?: string;
  name?: string | null;
  code?: string | null;
  discountType?: string | null;
  discountValue?: string | number | null;
  status?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  internalNote?: string | null;
  scope?: string | null;
  appliesTo?: string | null;
  productId?: string | null;
  minimumOrderUsd?: string | number | null;
  maxDiscountUsd?: string | number | null;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  redemptionCount?: string | number | null;
  usageLimit?: string | number | null;
  perCustomerLimit?: string | number | null;
  maxRedemptions?: string | number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function titleCase(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function text(value: unknown, fallback = "Not provided") {
  const label = titleCase(value);
  return label || fallback;
}

function money(value: unknown, fallback = "Not set") {
  if (value === null || value === undefined || value === "") return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function numberLabel(value: unknown, fallback = "No limit") {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : String(value);
}

function dateTime(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function discountLabel(row: CouponDiscountRow) {
  if (row.discountType === "free_shipping") return "Free shipping";
  if (row.discountType === "percentage") return `${Number(row.discountValue ?? 0).toFixed(0)}%`;
  return money(row.discountValue);
}

function statusTone(status: unknown) {
  const key = String(status ?? "draft").toLowerCase();
  if (key === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "expired" || key === "used_up") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function DetailField({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-950 ${mono ? "font-mono normal-case" : ""}`}>{String(value ?? "").trim() || "Not provided"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: unknown }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(status)}`}>{text(status, "Draft")}</span>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminCouponsDiscountsDetailClient({ row, kind }: { row: CouponDiscountRow; kind: CouponDiscountDetailKind }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const isCoupon = kind === "coupons";

  const sections = isCoupon
    ? [
        { id: "overview", label: "Coupon Overview", icon: TicketPercent },
        { id: "rules", label: "Discount Rules", icon: BadgePercent },
        { id: "usage", label: "Usage Limits", icon: ClipboardList },
        { id: "schedule", label: "Schedule", icon: CalendarClock },
        { id: "notes", label: "Internal Notes", icon: FileText },
      ]
    : [
        { id: "overview", label: "Discount Overview", icon: BadgePercent },
        { id: "rules", label: "Discount Rules", icon: TicketPercent },
        { id: "targeting", label: "Targeting", icon: Target },
        { id: "usage", label: "Usage Limits", icon: ClipboardList },
        { id: "schedule", label: "Schedule", icon: CalendarClock },
        { id: "notes", label: "Internal Notes", icon: FileText },
      ];

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={sections}
      topHeader={
        <AdminDetailHeader
          icon={isCoupon ? TicketPercent : BadgePercent}
          iconTheme="bg-emerald-50 text-emerald-700 border-emerald-100"
          category={isCoupon ? "Coupon Detail" : "Product Discount Detail"}
          title={isCoupon ? row.code ?? "Coupon" : row.name ?? "Discount"}
          subtitle={isCoupon ? row.name ?? "Checkout coupon rule" : "Product discount rule and targeting details."}
          onRefresh={() => router.refresh()}
          onBack={() => router.push(`/admin/finance/coupons-discounts?tab=${kind}`)}
          backLabel="Back to List"
        />
      }
      profileCard={
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{isCoupon ? "Checkout Coupon" : "Product Discount"}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{isCoupon ? row.code ?? "Coupon" : row.name ?? "Discount"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{isCoupon ? row.name ?? "No coupon name" : text(row.scope, "No scope set")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={row.status} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-700">{text(row.discountType, "Discount")}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{discountLabel(row)}</span>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-72">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Value</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{discountLabel(row)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{isCoupon ? text(row.appliesTo, "All orders") : text(row.scope, "All products")}</p>
          </div>
        </div>
      }
    >
      {activeSection === "overview" ? (
        <SectionCard title={isCoupon ? "Coupon Overview" : "Discount Overview"}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isCoupon ? (
              <>
                <DetailField label="Coupon Code" value={row.code} mono />
                <DetailField label="Coupon Name" value={row.name} />
                <DetailField label="Applies To" value={text(row.appliesTo)} />
              </>
            ) : (
              <>
                <DetailField label="Discount Name" value={row.name} />
                <DetailField label="Applies To" value={text(row.scope)} />
                <DetailField label="Product ID" value={row.productId ?? "Not set"} mono />
              </>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
              <div className="mt-2"><StatusBadge status={row.status} /></div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "rules" ? (
        <SectionCard title="Discount Rules">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Discount Type" value={text(row.discountType)} />
            <DetailField label="Value" value={discountLabel(row)} />
            {isCoupon ? (
              <>
                <DetailField label="Min Order USD" value={money(row.minimumOrderUsd)} />
                <DetailField label="Max Discount USD" value={money(row.maxDiscountUsd)} />
              </>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "targeting" && !isCoupon ? (
        <SectionCard title="Targeting">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Scope" value={text(row.scope)} />
            <DetailField label="Product ID" value={row.productId ?? "Not set"} mono />
            <DetailField label="Category" value={text(row.category)} />
            <DetailField label="Subcategory" value={text(row.subcategory)} />
            <DetailField label="Region" value={text(row.region)} />
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "usage" ? (
        <SectionCard title="Usage Limits">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isCoupon ? (
              <>
                <DetailField label="Usage Limit" value={numberLabel(row.usageLimit)} />
                <DetailField label="Per Customer" value={numberLabel(row.perCustomerLimit)} />
              </>
            ) : (
              <DetailField label="Max Redemptions" value={numberLabel(row.maxRedemptions)} />
            )}
            <DetailField label="Redemption Count" value={numberLabel(row.redemptionCount, "0")} />
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "schedule" ? (
        <SectionCard title="Schedule & Audit">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Start Date" value={dateTime(row.startsAt)} />
            <DetailField label="End Date" value={dateTime(row.endsAt)} />
            <DetailField label="Created At" value={dateTime(row.createdAt)} />
            <DetailField label="Updated At" value={dateTime(row.updatedAt)} />
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "notes" ? (
        <SectionCard title="Internal Notes">
          <p className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700">
            {String(row.internalNote ?? "").trim() || "No internal note provided."}
          </p>
        </SectionCard>
      ) : null}
    </AdminDetailLayout>
  );
}
