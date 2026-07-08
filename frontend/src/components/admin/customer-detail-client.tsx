"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  MapPin,
  NotebookPen,
  Pencil,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Unlock,
  User2,
  Users,
  X,
} from "lucide-react";
import { dashboardAlert, dashboardConfirm, dashboardError, dashboardLoading, dashboardSuccess } from "@/lib/dashboard-swal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { cn } from "@/lib/utils";
import { hasMeasurementValue, measurementDisplayGroups, normalizeMeasurementRecord } from "@/lib/measurement-fields";

// Admin payloads are assembled from multiple backend resources with uneven shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Customer = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderRow = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MeasurementRow = Record<string, any>;
type MeasurementDisplayRow = { label: string; values: Record<string, unknown>; orderId?: string; updatedAt?: string; meta?: string };
type FamilyDisplayRow = MeasurementDisplayRow & { id: string; relation: string; gender?: string; age?: string; orderLabel?: string; eventName?: string };
type FamilyGroupDisplayRow = {
  id: string;
  name: string;
  productName?: string;
  productImage?: string;
  eventName?: string;
  memberCount: number;
  readyMemberCount: number;
  currentStep: number;
  paid: boolean;
  ordered: boolean;
  inCart: boolean;
  selectionType?: string;
  updatedAt?: string | null;
  members: FamilyDisplayRow[];
};
type EventDisplayRow = {
  id: string;
  name: string;
  eventCode?: string;
  productName?: string;
  joinedCount: number;
  orderCount: number;
  paidCount: number;
  familyGroupCount: number;
  currentStep: number;
  totalValue: number;
  latestOrderDate?: string | null;
  statuses: string[];
  participants: Record<string, unknown>[];
  familyGroups: FamilyGroupDisplayRow[];
  orders: OrderRow[];
};
type ActivityData = {
  orders?: OrderRow[];
  events?: Array<Record<string, unknown>>;
  eventParticipants?: Array<Record<string, unknown>>;
  familyGroups?: Array<Record<string, unknown>>;
  familyMembers?: Array<Record<string, unknown>>;
};
type CustomerSectionId = "personal" | "contact" | "measurements" | "family" | "events" | "orders" | "documents" | "account" | "notes";

type CustomerReportStats = {
  totalOrders: number;
  totalSpent: number;
  averageOrder: number;
  latestOrderDate?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "$0.00";
}

function initials(name?: string | null, email?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email?.slice(0, 2)?.toUpperCase() || "--"
  );
}

function badgeTone(kind: "account" | "type", value?: string | null) {
  const v = String(value ?? "").toLowerCase();
  if (kind === "account") {
    if (v === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (v === "inactive" || v === "blocked" || v === "suspended") return "bg-blue-100 text-blue-800 border-blue-200";
    if (v === "pending" || v === "invited") return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (kind === "type") {
    if (v === "vip") return "bg-purple-100 text-purple-800 border-purple-200";
    if (v === "wholesale") return "bg-amber-100 text-amber-800 border-amber-200";
    if (v === "returning") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function Field({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  const display = value && String(value).trim() ? String(value) : "Not provided";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      {href ? (
        <a href={href} className="mt-1 block text-sm font-semibold text-blue-900 hover:underline">
          {display}
        </a>
      ) : (
        <div className="mt-1 text-sm font-semibold text-slate-950">{display}</div>
      )}
    </div>
  );
}

function DocumentListRow({
  title,
  tags,
  status,
  children,
}: {
  title: string;
  tags: string[];
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
            <FileText className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-950">{title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold uppercase text-slate-600">
                  {tag}
                </span>
              ))}
              {status ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase text-emerald-800">
                  {status}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePhone(value: string) {
  return /^[+\d][\d\s-]{6,24}$/.test(value.trim());
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function friendlyApiError(message: unknown) {
  const raw = String(message ?? "").trim();
  if (!raw) return "Please check the form and try again.";

  try {
    const parsed = JSON.parse(raw);
    const issues = parsed?.error?.issues ?? parsed?.issues;
    if (Array.isArray(issues) && issues.length) {
      const issue = issues[0];
      const field = Array.isArray(issue.path) ? String(issue.path.at(-1) ?? "field") : "field";
      if (field === "phone") return "Phone number cannot be empty. Add a valid phone number or leave it blank.";
      if (field === "email") return "Please enter a valid email address.";
      if (field === "name") return "Customer name is required.";
      return `Please check ${field.replaceAll("_", " ")} and try again.`;
    }
  } catch {
    // Backend errors are sometimes already plain text.
  }

  if (raw.includes('"phone"') || raw.toLowerCase().includes("phone")) {
    return "Phone number cannot be empty. Add a valid phone number or leave it blank.";
  }
  if (raw.includes("too_small") || raw.includes("expected string")) return "Please check the highlighted fields and try again.";
  return raw.length > 180 ? "Please check the form and try again." : raw;
}

function MeasurementInput({ label, value }: { label: string; value: unknown }) {
  const display = value !== null && value !== undefined && String(value).trim() ? String(value) : "";
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <div className="flex h-11 w-full items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm">
        {display || <span className="font-medium text-slate-400">Not provided</span>}
      </div>
    </label>
  );
}

function orderTotal(order: OrderRow) {
  return Number(order.total ?? order.totalUsd ?? order.amount ?? order.grandTotal ?? 0);
}

function orderCustomerEmail(order: OrderRow) {
  return String(order.userEmail ?? order.email ?? order.customerEmail ?? "").toLowerCase();
}

function orderShippingMethod(order: OrderRow) {
  const raw = order.shippingMethod ?? order.shipping_method ?? order.deliveryMethod ?? order.delivery_method ?? order.fulfillmentMethod ?? order.shippingType ?? order.deliveryType;
  const value = hasMeasurementValue(raw) ? String(raw) : "Not provided";
  const normalized = value.toLowerCase();
  if (normalized.includes("ems") || normalized.includes("mail")) return "EMS";
  if (normalized.includes("office") || normalized.includes("pickup")) return "Office pickup";
  return value;
}

function orderStatus(order: OrderRow) {
  return String(order.status ?? order.orderStatus ?? order.productionStatus ?? "Not provided");
}

function hasUploadedDesign(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items : Array.isArray(order.orderItems) ? order.orderItems : [];
  return items.some((item: Record<string, unknown>) => (
    item.uploaded_design_id ||
    item.uploadedDesignId ||
    item.item_type === "custom_design" ||
    item.itemType === "custom_design"
  )) || Boolean(order.uploadedDesignId ?? order.uploaded_design_id ?? order.customDesignId ?? order.custom_design_id);
}

function normalizedOrderKind(order: OrderRow) {
  const type = String(order.orderType ?? order.type ?? "catalog_order").toLowerCase();
  if (type === "custom_order" || type === "custom_design_order" || type === "custom" || type.includes("custom")) return "custom_order";
  if (type === "group_order") return hasUploadedDesign(order) ? "custom_order" : "catalog_order";
  return "catalog_order";
}

function normalizedOrderMode(order: OrderRow) {
  const mode = String(order.orderMode ?? order.mode ?? "").toLowerCase();
  if (
    mode === "group" ||
    String(order.orderType ?? "").toLowerCase() === "group_order" ||
    Boolean(order.groupId ?? order.groupOrderId ?? order.familyGroupId ?? order.family_group_id ?? order.eventId) ||
    Boolean(Array.isArray(order.members) && order.members.length)
  ) {
    return "group";
  }
  return "individual";
}

function orderType(order: OrderRow) {
  const mode = normalizedOrderMode(order) === "group" ? "Group" : "Individual";
  const kind = normalizedOrderKind(order) === "custom_order" ? "Custom" : "Catalog";
  return `${mode} ${kind}`;
}

function normalizeMeasurementValues(values: Record<string, unknown> = {}) {
  return normalizeMeasurementRecord(values);
}

function collectMeasurements(savedMeasurements: MeasurementRow[], orders: OrderRow[]) {
  const rows: MeasurementDisplayRow[] = [];
  for (const measurement of savedMeasurements) {
    const values = normalizeMeasurementValues(measurement);
    if (Object.keys(values).length) {
      rows.push({
        label: String(measurement.label ?? "Saved measurement"),
        values,
        updatedAt: measurement.updatedAt ? String(measurement.updatedAt) : undefined,
        meta: "Saved profile",
      });
    }
  }
  for (const order of orders) {
    if (order.measurementSnapshot && typeof order.measurementSnapshot === "object") {
      rows.push({ label: "Order measurement snapshot", values: normalizeMeasurementValues(order.measurementSnapshot), orderId: order.id, meta: order.orderNumber ? `Order #${order.orderNumber}` : "Order snapshot" });
    }
    if (order.measurements && typeof order.measurements === "object") {
      rows.push({ label: "Order measurement", values: normalizeMeasurementValues(order.measurements), orderId: order.id, meta: order.orderNumber ? `Order #${order.orderNumber}` : "Order measurement" });
    }
    if (Array.isArray(order.members)) {
      order.members.forEach((member: Record<string, unknown>, index: number) => {
        if (member?.measurements && typeof member.measurements === "object") {
          rows.push({
            label: String(member.name ?? member.relation ?? member.role ?? `Member ${index + 1}`),
            values: normalizeMeasurementValues(member.measurements as Record<string, unknown>),
            orderId: order.id,
            meta: [member.relation ?? member.role ?? member.type, order.orderNumber ? `Order #${order.orderNumber}` : null].filter(Boolean).join(" - "),
          });
        }
      });
    }
  }
  return rows;
}

function collectFamilyMembers(orders: OrderRow[], activity?: ActivityData | null) {
  const rows: FamilyDisplayRow[] = [];
  const groups = new Map((activity?.familyGroups ?? []).map((group) => [String(group.id), group]));
  for (const member of activity?.familyMembers ?? []) {
    const group = groups.get(String(member.familyGroupId ?? member.family_group_id ?? ""));
    const values = member?.measurements && typeof member.measurements === "object" ? normalizeMeasurementValues(member.measurements as Record<string, unknown>) : {};
    rows.push({
      id: String(member.id),
      label: String(member.name ?? "Family Member"),
      relation: String(member.relation ?? "Member"),
      gender: hasMeasurementValue(member.gender) ? String(member.gender) : undefined,
      age: hasMeasurementValue(member.age) ? String(member.age) : undefined,
      values,
      orderLabel: group?.groupName ? String(group.groupName) : undefined,
      eventName: hasMeasurementValue(group?.eventName) ? String(group?.eventName) : undefined,
      updatedAt: hasMeasurementValue(member.updatedAt) ? String(member.updatedAt) : undefined,
      meta: [member.gender, hasMeasurementValue(member.age) ? `Age ${member.age}` : null, group?.groupName].filter(Boolean).join(" - "),
    });
  }
  for (const order of orders) {
    if (!Array.isArray(order.members)) continue;
    order.members.forEach((member: Record<string, unknown>, index: number) => {
      const values = member?.measurements && typeof member.measurements === "object" ? normalizeMeasurementValues(member.measurements as Record<string, unknown>) : {};
      rows.push({
        id: String(member.id ?? `${order.id ?? order.orderNumber ?? "order"}-${index}`),
        label: String(member.name ?? `Family Member ${index + 1}`),
        relation: String(member.relation ?? member.role ?? member.type ?? "Member"),
        gender: hasMeasurementValue(member.gender) ? String(member.gender) : undefined,
        age: hasMeasurementValue(member.age ?? member.member_age) ? String(member.age ?? member.member_age) : undefined,
        values,
        orderId: order.id,
        orderLabel: order.orderNumber ? `Order #${order.orderNumber}` : undefined,
        eventName: hasMeasurementValue(order.eventName) ? String(order.eventName) : undefined,
        meta: [member.gender, hasMeasurementValue(member.age ?? member.member_age) ? `Age ${member.age ?? member.member_age}` : null, order.orderNumber ? `Order #${order.orderNumber}` : null].filter(Boolean).join(" - "),
      });
    });
  }
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function collectFamilyGroups(activity: ActivityData | null | undefined, fallbackMembers: FamilyDisplayRow[]): FamilyGroupDisplayRow[] {
  const members = activity?.familyMembers ?? [];
  const groups = activity?.familyGroups ?? [];
  if (!groups.length) {
    return fallbackMembers.length
      ? [{
          id: "order-family-members",
          name: "Family Members From Orders",
          memberCount: fallbackMembers.length,
          readyMemberCount: fallbackMembers.filter((member) => Object.keys(member.values).length > 0).length,
          currentStep: 4,
          paid: false,
          ordered: true,
          inCart: false,
          productName: undefined,
          productImage: undefined,
          eventName: undefined,
          selectionType: undefined,
          updatedAt: null,
          members: fallbackMembers,
        }]
      : [];
  }
  return groups.map((group) => {
    const groupMembers = members
      .filter((member) => String(member.familyGroupId ?? member.family_group_id ?? "") === String(group.id))
      .map((member) => {
        const values = member?.measurements && typeof member.measurements === "object" ? normalizeMeasurementValues(member.measurements as Record<string, unknown>) : {};
        return {
          id: String(member.id),
          label: String(member.name ?? "Family Member"),
          relation: String(member.relation ?? "Member"),
          gender: hasMeasurementValue(member.gender) ? String(member.gender) : undefined,
          age: hasMeasurementValue(member.age) ? String(member.age) : undefined,
          values,
          updatedAt: hasMeasurementValue(member.updatedAt) ? String(member.updatedAt) : undefined,
          eventName: hasMeasurementValue(group.eventName) ? String(group.eventName) : undefined,
          meta: [member.gender, hasMeasurementValue(member.age) ? `Age ${member.age}` : null, group.groupName].filter(Boolean).join(" - "),
        };
      });
    return {
      id: String(group.id),
      name: String(group.groupName ?? "Family Group"),
      productName: hasMeasurementValue(group.productName) ? String(group.productName) : undefined,
      productImage: hasMeasurementValue(group.productImage) ? String(group.productImage) : undefined,
      eventName: hasMeasurementValue(group.eventName) ? String(group.eventName) : undefined,
      memberCount: Number(group.memberCount ?? groupMembers.length ?? 0),
      readyMemberCount: Number(group.readyMemberCount ?? groupMembers.filter((member) => Object.keys(member.values).length > 0).length),
      currentStep: Number(group.currentStep ?? 1),
      paid: Boolean(group.paid),
      ordered: Boolean(group.ordered),
      inCart: Boolean(group.inCart),
      selectionType: hasMeasurementValue(group.selectionType) ? String(group.selectionType) : undefined,
      updatedAt: hasMeasurementValue(group.updatedAt) ? String(group.updatedAt) : null,
      members: groupMembers,
    } satisfies FamilyGroupDisplayRow;
  });
}

function collectEventRows(orders: OrderRow[], activity?: ActivityData | null, familyGroups: FamilyGroupDisplayRow[] = []) {
  if (activity?.events?.length) {
    return activity.events.map((event) => {
      const eventId = String(event.id);
      const eventOrders = orders.filter((order) => String(order.eventId ?? "") === eventId);
      const participants = (activity.eventParticipants ?? []).filter((participant) => String(participant.eventId ?? "") === eventId);
      const groups = familyGroups.filter((group) => String((activity.familyGroups ?? []).find((row) => String(row.id) === group.id)?.eventId ?? "") === eventId);
      return {
        id: eventId,
        name: String(event.name ?? "Event"),
        eventCode: hasMeasurementValue(event.eventCode) ? String(event.eventCode) : undefined,
        productName: hasMeasurementValue(event.productName) ? String(event.productName) : undefined,
        joinedCount: Number(event.participantCount ?? participants.length ?? 0),
        orderCount: Number(event.orderCount ?? eventOrders.length ?? 0),
        paidCount: Number(event.paidCount ?? eventOrders.filter((order) => String(order.paymentStatus ?? "").toLowerCase() === "paid").length),
        familyGroupCount: Number(event.familyGroupCount ?? groups.length ?? 0),
        currentStep: Number(event.currentStep ?? 1),
        totalValue: eventOrders.reduce((sum, order) => sum + orderTotal(order), 0),
        latestOrderDate: eventOrders[0]?.createdAt ? String(eventOrders[0].createdAt) : hasMeasurementValue(event.updatedAt) ? String(event.updatedAt) : null,
        statuses: Array.from(new Set(eventOrders.map((order) => String(order.status ?? "")).filter(Boolean))),
        participants,
        familyGroups: groups,
        orders: eventOrders,
      } satisfies EventDisplayRow;
    });
  }
  const grouped = new Map<string, EventDisplayRow>();
  for (const order of orders) {
    const eventId = String(order.eventId ?? "");
    const eventName = String(order.eventName ?? "");
    if (!eventId && !eventName) continue;
    const key = eventId || eventName;
    const current = grouped.get(key) ?? {
      id: key,
      name: eventName || `Event ${eventId.slice(0, 8)}`,
      joinedCount: 0,
      orderCount: 0,
      totalValue: 0,
      latestOrderDate: null,
      statuses: [],
      paidCount: 0,
      familyGroupCount: 0,
      currentStep: 4,
      participants: [],
      familyGroups: [],
      orders: [],
    };
    const memberCount = Array.isArray(order.members) ? order.members.length : Number(order.memberCount ?? order.joinedCount ?? 1);
    current.joinedCount += Number.isFinite(memberCount) && memberCount > 0 ? memberCount : 1;
    current.orderCount += 1;
    current.orders.push(order);
    current.totalValue += orderTotal(order);
    if (String(order.paymentStatus ?? "").toLowerCase() === "paid") current.paidCount += 1;
    if (hasMeasurementValue(order.status) && !current.statuses.includes(String(order.status))) current.statuses.push(String(order.status));
    const orderDate = hasMeasurementValue(order.createdAt) ? String(order.createdAt) : null;
    if (orderDate && (!current.latestOrderDate || new Date(orderDate).getTime() > new Date(current.latestOrderDate).getTime())) {
      current.latestOrderDate = orderDate;
    }
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).sort((a, b) => new Date(b.latestOrderDate ?? 0).getTime() - new Date(a.latestOrderDate ?? 0).getTime());
}

function MeasurementDisplayCard({ row, compact = false }: { row: MeasurementDisplayRow; compact?: boolean }) {
  const groups = measurementDisplayGroups(row.values);
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50", compact ? "p-4" : "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">{row.label}</h3>
          {row.meta ? <p className="mt-1 text-xs font-semibold text-slate-500">{row.meta}</p> : null}
        </div>
        {row.updatedAt ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Updated {formatDate(row.updatedAt)}</span> : null}
      </div>
      {groups.length ? (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{group.title}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map(([key, value]) => (
                  <MeasurementInput key={`${group.title}-${key}`} label={key} value={value} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">No measurement values recorded.</p>
      )}
    </div>
  );
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
}

function downloadDateLabel() {
  return new Date().toISOString().slice(0, 10);
}

function datedPdfFilename(name: string, label: string) {
  return `${safeFilename(`${name} ${label}`)} (${downloadDateLabel()}).pdf`;
}

type MeasurementPdfPerson = MeasurementDisplayRow & { groupName?: string };

function downloadUnifiedMeasurementPdf({
  filename,
  title,
  subtitle,
  customerName,
  people,
}: {
  filename: string;
  title: string;
  subtitle?: string;
  customerName?: string;
  people: MeasurementPdfPerson[];
}) {
  const pdf = new jsPDF({ orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;

  function ensureSpace(y: number, needed = 22) {
    if (y + needed <= 284) return y;
    pdf.addPage();
    return 18;
  }

  pdf.setFontSize(16);
  pdf.text(title, margin, 16);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text([subtitle, `Generated ${new Date().toLocaleString()}`].filter(Boolean).join(" - "), margin, 22);
  pdf.setTextColor(15, 23, 42);

  let y = 34;
  let currentGroupName = "";
  people.forEach((row, index) => {
    if (row.groupName && row.groupName !== currentGroupName) {
      y = ensureSpace(y, 24);
      currentGroupName = row.groupName;
      pdf.setFillColor(239, 246, 255);
      pdf.setDrawColor(191, 219, 254);
      pdf.roundedRect(margin, y - 8, pageWidth - margin * 2, 20, 2, 2, "FD");
      pdf.setFontSize(9);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`Customer Name: ${customerName ?? "Not provided"}`, margin + 4, y);
      pdf.text(`Group Name: ${currentGroupName}`, margin + 4, y + 7);
      pdf.setTextColor(15, 23, 42);
      y += 22;
    }

    y = ensureSpace(index === 0 ? y : y + 8, 34);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, y - 8, pageWidth - margin * 2, 20, 3, 3, "F");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Member Name: ${row.label}`, margin + 4, y);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(row.meta ?? "Measurement sheet", margin + 4, y + 6);
    y += 18;

    measurementDisplayGroups(row.values).filter((group) => group.title !== "Profile").forEach((group) => {
      y = ensureSpace(y, 26);
      pdf.setFontSize(9);
      pdf.setTextColor(37, 99, 235);
      pdf.text(group.title.toUpperCase(), margin, y);
      y += 5;
      group.fields.forEach(([field, value], fieldIndex) => {
        const col = fieldIndex % 2;
        const x = margin + col * 92;
        if (col === 0 && fieldIndex > 0) y = ensureSpace(y + 16, 18);
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, 84, 12, 2, 2, "FD");
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.text(field, x + 3, y + 4);
        pdf.setFontSize(8);
        pdf.setTextColor(15, 23, 42);
        pdf.text(String(value ?? "Not provided"), x + 3, y + 9);
      });
      y += group.fields.length ? 18 : 4;
    });

    if (index < people.length - 1) {
      y = ensureSpace(y + 4, 10);
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.8);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  });

  pdf.save(filename);
}

function downloadMeasurementPdf(filename: string, title: string, rows: MeasurementDisplayRow[], subtitle?: string) {
  downloadUnifiedMeasurementPdf({ filename, title, subtitle, people: rows });
}

function downloadGroupMeasurementPdf({
  filename,
  customerName,
  title,
  groups,
}: {
  filename: string;
  customerName: string;
  title: string;
  groups: FamilyGroupDisplayRow[];
}) {
  const people = groups.flatMap((group) =>
    group.members
      .filter((member) => Object.values(member.values).some(hasMeasurementValue))
      .map((member) => ({
        ...member,
        groupName: group.name,
      })),
  );
  downloadUnifiedMeasurementPdf({
    filename,
    title,
    subtitle: `Customer Name: ${customerName}${groups.length === 1 ? ` | Group Name: ${groups[0]?.name ?? ""}` : " | Group Name: All groups"}`,
    customerName,
    people,
  });
}

function downloadCustomerReportPdf({
  customer,
  fullName,
  stats,
  orders,
  familyGroups,
  events,
}: {
  customer: Customer;
  fullName: string;
  stats: CustomerReportStats;
  orders: OrderRow[];
  familyGroups: FamilyGroupDisplayRow[];
  events: EventDisplayRow[];
}) {
  const pdf = new jsPDF({ orientation: "landscape" });
  const shippingCounts = orders.reduce<Record<string, number>>((counts, order) => {
    const method = orderShippingMethod(order);
    counts[method] = (counts[method] ?? 0) + 1;
    return counts;
  }, {});

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 297, 24, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text("Customer Report", 14, 13);
  pdf.setFontSize(9);
  pdf.text(`${fullName} - Generated ${new Date().toLocaleString()}`, 14, 20);
  pdf.text("Yehager Bahil Libs", 250, 15);
  pdf.setTextColor(15, 23, 42);

  autoTable(pdf, {
    startY: 32,
    head: [["Customer", "Email", "Phone", "Location", "Status"]],
    body: [[fullName, String(customer.email ?? "Not provided"), String(customer.phone ?? "Not provided"), [customer.city, customer.country].filter(Boolean).join(", ") || "Not provided", String(customer.accountStatus ?? customer.status ?? "Not provided")]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  autoTable(pdf, {
    startY: 58,
    head: [["Total Orders", "Total Revenue", "Average Order", "Group Orders", "Events", "Latest Order"]],
    body: [[String(stats.totalOrders), formatMoney(stats.totalSpent), formatMoney(stats.averageOrder), String(familyGroups.length), String(events.length), formatDate(stats.latestOrderDate)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(pdf, {
    startY: 84,
    head: [["Shipping Method", "Orders"]],
    body: Object.entries(shippingCounts).length ? Object.entries(shippingCounts).map(([method, count]) => [method, String(count)]) : [["Not provided", "0"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  autoTable(pdf, {
    startY: 112,
    head: [["Order", "Order Type", "Status", "Payment", "Shipping", "Total", "Date"]],
    body: orders.length
      ? orders.map((order) => [
          String(order.orderNumber ?? order.id ?? "Not provided"),
          orderType(order),
          orderStatus(order),
          String(order.paymentStatus ?? "Not provided"),
          orderShippingMethod(order),
          formatMoney(orderTotal(order)),
          formatDate(order.createdAt ?? order.orderDate),
        ])
      : [["No orders found", "", "", "", "", "", ""]],
    styles: { fontSize: 7, cellWidth: "wrap" },
    headStyles: { fillColor: [15, 23, 42] },
  });

  pdf.addPage("landscape");
  autoTable(pdf, {
    startY: 16,
    head: [["Group Order", "Product", "Event", "Members", "Ready", "State", "Updated"]],
    body: familyGroups.length
      ? familyGroups.map((group) => [
          group.name,
          group.productName ?? "Not selected",
          group.eventName ?? "Not provided",
          String(group.memberCount),
          String(group.readyMemberCount),
          group.paid ? "Paid" : group.ordered ? "Ordered" : group.inCart ? "In cart" : "Draft",
          formatDate(group.updatedAt),
        ])
      : [["No group orders found", "", "", "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  pdf.save(datedPdfFilename(fullName, "Customer Report"));
}

export function CustomerDetailClient({
  initialCustomer,
  orders = [],
  measurements = [],
  activity = null,
  canEdit = false,
  canDelete = false,
  embedded = false,
}: {
  initialCustomer: Customer;
  orders?: Array<Record<string, unknown>>;
  measurements?: Array<Record<string, unknown>>;
  activity?: ActivityData | null;
  backTab?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email_link" | "temp_password">("email_link");
  const [resetFlowNotice, setResetFlowNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<CustomerSectionId>("personal");

  const [firstName, setFirstName] = useState(String(customer.firstName ?? ""));
  const [fatherName, setFatherName] = useState(String(customer.fatherName ?? ""));
  const [grandfatherName, setGrandfatherName] = useState(String(customer.grandfatherName ?? ""));
  const [gender, setGender] = useState(String(customer.gender ?? ""));
  const [dateOfBirth, setDateOfBirth] = useState(String(customer.dateOfBirth ?? "").slice(0, 10));
  const [email, setEmail] = useState(String(customer.email ?? ""));
  const [phone, setPhone] = useState(String(customer.phone ?? ""));
  const [country, setCountry] = useState(String(customer.country ?? ""));
  const [city, setCity] = useState(String(customer.city ?? ""));
  const [address, setAddress] = useState(String(customer.address ?? ""));
  const [accountStatus, setAccountStatus] = useState(String(customer.accountStatus ?? customer.status ?? "active"));
  const [customerType, setCustomerType] = useState(String(customer.customerType ?? "standard"));
  const [notes, setNotes] = useState(String(customer.notes ?? ""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [expandedFamilyGroupId, setExpandedFamilyGroupId] = useState<string | null>(null);
  const [expandedFamilyMemberId, setExpandedFamilyMemberId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedDocumentGroupId, setExpandedDocumentGroupId] = useState<string | null>(null);

  const passwordRules = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isPasswordValid =
    passwordRules.minLength && passwordRules.uppercase && passwordRules.lowercase && passwordRules.number && passwordRules.special;
  const doPasswordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmitResetPassword = !busy && isPasswordValid && doPasswordsMatch;

  const fullName = useMemo(() => {
    const composed = [firstName, fatherName, grandfatherName].map((part) => part.trim()).filter(Boolean).join(" ");
    return composed || String(customer.name ?? "Customer");
  }, [customer.name, fatherName, firstName, grandfatherName]);

  const customerOrders = useMemo(() => {
    const emailKey = String(customer.email ?? email ?? "").toLowerCase();
    const sourceOrders = activity?.orders?.length ? activity.orders : (orders as OrderRow[]);
    return sourceOrders.filter((order) => {
      const orderEmail = orderCustomerEmail(order);
      return !emailKey || orderEmail === emailKey || String(order.userId ?? "") === String(customer.id ?? "");
    });
  }, [activity, customer.email, customer.id, email, orders]);

  const stats = useMemo(() => {
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, order) => sum + orderTotal(order), 0);
    const latestOrder = customerOrders
      .slice()
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
    return {
      totalOrders,
      totalSpent,
      averageOrder: totalOrders ? totalSpent / totalOrders : 0,
      latestOrderDate: latestOrder?.createdAt ? String(latestOrder.createdAt) : null,
    };
  }, [customerOrders]);

  const measurementRows = useMemo(() => collectMeasurements(measurements as MeasurementRow[], customerOrders), [measurements, customerOrders]);
  const familyRows = useMemo(() => collectFamilyMembers(customerOrders, activity), [activity, customerOrders]);
  const familyGroupRows = useMemo(() => collectFamilyGroups(activity, familyRows), [activity, familyRows]);
  const eventRows = useMemo(() => collectEventRows(customerOrders, activity, familyGroupRows), [activity, customerOrders, familyGroupRows]);
  const accountOwnerMeasurement = useMemo(() => measurementRows.find((row) => row.meta === "Saved profile") ?? null, [measurementRows]);
  const photoUrl = customer.profilePhotoUrl || customer.avatarUrl || null;
  const isBlocked = ["inactive", "blocked", "suspended"].includes(String(accountStatus).toLowerCase());

  async function refreshDetail() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/customers/${customer.id}`);
      const json = await res.json();
      const nextCustomer = json?.data?.user ?? json?.data;
      if (res.ok && nextCustomer) {
        setCustomer(nextCustomer);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!canEdit) return;
    const cleanFirstName = firstName.trim();
    const cleanFatherName = fatherName.trim();
    const cleanGrandfatherName = grandfatherName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    if (!cleanFirstName) return await dashboardError("Validation Error", "First name is required.");
    if (!cleanFatherName) return await dashboardError("Validation Error", "Father name is required.");
    if (!cleanEmail) return await dashboardError("Validation Error", "Email address is required.");
    if (!validateEmail(cleanEmail)) return await dashboardError("Validation Error", "Please enter a valid email address.");
    if (cleanPhone && !validatePhone(cleanPhone)) return await dashboardError("Validation Error", "Please enter a valid phone number, or leave the field blank.");

    setBusy(true);
    try {
      const profilePayload: Record<string, unknown> = {
        firstName: cleanFirstName,
        fatherName: cleanFatherName,
        grandfatherName: cleanGrandfatherName || null,
        gender: gender.trim() || undefined,
        dateOfBirth: dateOfBirth || null,
        country: cleanOptionalText(country),
        city: cleanOptionalText(city),
        address: cleanOptionalText(address),
        notes: cleanOptionalText(notes),
      };
      const body: Record<string, unknown> = {
        name: [cleanFirstName, cleanFatherName, cleanGrandfatherName].filter(Boolean).join(" ") || fullName,
        email: cleanEmail,
        phone: cleanPhone || null,
        address: cleanOptionalText(address),
        country: cleanOptionalText(country),
        city: cleanOptionalText(city),
        notes: cleanOptionalText(notes),
        profile: profilePayload,
      };
      if (["active", "invited", "pending"].includes(accountStatus)) {
        body.accountStatus = accountStatus;
      }
      const res = await fetch(`/api/backend/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(friendlyApiError(json?.message ?? json));
      const nextCustomer = json?.data?.user ?? json?.data;
      if (nextCustomer) setCustomer(nextCustomer);
      await dashboardSuccess("Customer Updated", "Customer profile saved successfully.");
      setEditMode(false);
      await refreshDetail();
      router.refresh();
    } catch (e) {
      await dashboardError("Update Failed", friendlyApiError(e instanceof Error ? e.message : "Unable to update customer."));
    } finally {
      setBusy(false);
    }
  }

  function openResetPasswordModal() {
    setResetMethod("email_link");
    setResetFlowNotice(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetOpen(true);
  }

  async function sendResetLink() {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/customers/${customer.id}/password-reset-link`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to send reset link."));
      setResetFlowNotice({
        tone: "success",
        message: "A secure password reset link has been sent to the customer's email address.",
      });
      await dashboardSuccess("Password Reset Link Sent", "A secure password reset link has been sent to the customer's email address.");
      await refreshDetail();
      router.refresh();
    } catch (e) {
      setResetFlowNotice({ tone: "error", message: e instanceof Error ? e.message : "Unable to send reset link." });
      await dashboardError("Password Reset Failed", e instanceof Error ? e.message : "Unable to send reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!canEdit) return;
    if (!isPasswordValid || !doPasswordsMatch) {
      await dashboardError("Validation Error", "Please make sure the password meets all requirements and matches the confirmation password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/customers/${customer.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(json?.message ?? "Reset failed"));
      setResetOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      setResetFlowNotice(null);
      await dashboardSuccess("Password Reset Successfully", "Customer password has been updated successfully.");
      await refreshDetail();
      router.refresh();
    } catch (e) {
      await dashboardError("Password Reset Failed", e instanceof Error ? e.message : "Unable to reset password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!canEdit) return;
    const next = isBlocked ? "active" : "inactive";
    const confirmed = await dashboardConfirm({
      title: isBlocked ? "Activate this account?" : "Deactivate this account?",
      text: isBlocked
        ? "Activating will restore customer account access and send an email notification."
        : "Deactivating will remove customer account access and send an email notification.",
      confirmButtonText: isBlocked ? "Yes, activate" : "Yes, deactivate",
      cancelButtonText: "No, cancel",
      tone: isBlocked ? "success" : "warning",
      icon: "warning",
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      dashboardLoading(isBlocked ? "Activating..." : "Deactivating...", "Please wait a moment.");
      const res = await fetch(`/api/backend/admin/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(json?.message ?? "Status update failed"));
      setAccountStatus(next);
      dashboardLoading.close();
      await dashboardAlert(
        next === "active" ? "Account Activated" : "Account Deactivated",
        next === "active"
          ? "Customer account has been activated successfully. Notification emails have been sent."
          : "Customer account has been deactivated successfully. Notification emails have been sent.",
        { icon: "success", tone: "success", confirmButtonText: "OK" },
      );
      await refreshDetail();
      router.refresh();
    } catch (e) {
      dashboardLoading.close();
      await dashboardAlert("Status Update Failed", e instanceof Error ? e.message : "Unable to update customer status.", {
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!canDelete) return;
    const ok = await dashboardConfirm({
      title: "Are you sure?",
      text: "This customer account will be permanently deleted. This action cannot be undone.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!ok) return;
    setBusy(true);
    try {
      dashboardLoading("Deleting...", "Please wait a moment.");
      const res = await fetch(`/api/backend/admin/customers/${customer.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = String(json?.message ?? "Delete failed");
        if (res.status === 409 || /history|activity|audit/i.test(message)) {
          dashboardLoading.close();
          const forceConfirm = await dashboardConfirm({
            title: "Cannot Delete Account",
            text: "This account can't be deleted because it has activity history. Would you like to permanently delete the account AND its activity history?",
            confirmButtonText: "Continue",
            cancelButtonText: "OK",
            tone: "danger",
            icon: "warning",
          });
          
          if (!forceConfirm) {
            return;
          }
          
          dashboardLoading("Deleting...", "Please wait a moment.");
          const forceRes = await fetch(`/api/backend/admin/customers/${customer.id}?force=true`, { method: "DELETE" });
          const forceJson = await forceRes.json().catch(() => null);
          if (!forceRes.ok) {
            throw new Error(String(forceJson?.message ?? "Delete failed"));
          }
        } else {
          throw new Error(message);
        }
      }
      dashboardLoading.close();
      await dashboardAlert("Deleted Successfully", "Customer account has been deleted successfully.", {
        icon: "success",
        tone: "success",
        confirmButtonText: "OK",
      });
      router.push("/admin/customers");
      router.refresh();
    } catch (e) {
      dashboardLoading.close();
      await dashboardAlert("Delete Failed", e instanceof Error ? e.message : "Unable to delete customer.", {
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminDetailLayout
        embedded={embedded}
        topHeader={
          <AdminDetailHeader
            icon={Users}
            iconTheme="bg-emerald-50 text-emerald-700"
            category="Customers"
            title={fullName}
            subtitle="Manage customer profile, contact details, measurements, orders, and account status."
            onRefresh={() => {
              void refreshDetail();
              void dashboardSuccess("Page Refreshed", "Customer details have been reloaded.");
            }}
            onBack={() => router.push("/admin/customers")}
            backLabel="Back to Customers"
          />
        }
        sections={[
          { id: "personal", label: "Identity Profile", icon: User2 },
          { id: "contact", label: "Contact & Address", icon: MapPin },
          { id: "measurements", label: "Measurements & Fit", icon: Ruler },
          { id: "family", label: "Family Members", icon: Users },
          { id: "events", label: "Event Participation", icon: CalendarDays },
          { id: "orders", label: "Order History", icon: ShoppingBag },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "account", label: "Account Overview", icon: FileText },
          { id: "notes", label: "Internal Notes", icon: NotebookPen },
        ]}
        activeSection={activeSection}
        onSectionChange={(id) => setActiveSection(id as CustomerSectionId)}
        profileCard={
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="h-[180px] w-[180px] rounded-2xl border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-3xl font-bold text-slate-600">
                  {initials(fullName, email)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                  {isBlocked ? <Lock className="h-5 w-5 text-blue-600" /> : <User2 className="h-5 w-5 text-slate-600" />}
                  <span>{fullName}</span>
                </h1>
                <div className="mt-1 text-sm text-slate-600">Customer ID: {customer.id}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", badgeTone("account", accountStatus))}>
                    {isBlocked ? "Inactive" : "Active"}
                  </span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", badgeTone("type", customerType))}>
                    {customerType || "standard"}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-sm text-slate-700">
                  {email ? <a className="hover:underline" href={`mailto:${email}`}>{email}</a> : null}
                  {phone ? <a className="hover:underline" href={`tel:${phone}`}>{phone}</a> : null}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col items-stretch gap-2 md:w-auto">
              {!editMode ? (
                <>
                  {canEdit ? (
                    <>
                      <button type="button" onClick={() => setEditMode(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8]">
                        <Pencil className="h-4 w-4" />
                        Edit User
                      </button>
                      <button type="button" onClick={() => void toggleActive()} disabled={busy} className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50", isBlocked ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#EA580C] hover:bg-[#C2410C]")}>
                        {isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {isBlocked ? "Activate Account" : "Deactivate Account"}
                      </button>
                      <button type="button" onClick={openResetPasswordModal} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#6D28D9] disabled:opacity-50">
                        <Lock className="h-4 w-4" />
                        Reset Password
                      </button>
                    </>
                  ) : null}
                  {canDelete ? (
                    <button type="button" onClick={() => void remove()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#DC2626] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50">
                    <ShieldCheck className="h-4 w-4" />
                    Update
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        }
      >
        {activeSection === "personal" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Identity Profile</h2>
            {editMode ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextInput label="First Name" value={firstName} onChange={setFirstName} />
                <TextInput label="Father's Name" value={fatherName} onChange={setFatherName} />
                <TextInput label="Grandfather" value={grandfatherName} onChange={setGrandfatherName} />
                <SelectInput label="Gender" value={gender} onChange={setGender} options={[{ value: "", label: "Not provided" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                <TextInput label="Birth Date" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
                <TextInput label="Customer Type" value={customerType} onChange={setCustomerType} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Full Name" value={fullName} />
                <Field label="Gender" value={gender} />
                <Field label="Birth Date" value={formatDate(dateOfBirth)} />
                <Field label="Customer Type" value={customerType} />
                <Field label="Created Date" value={formatDate(customer.createdAt)} />
                <Field label="Last Updated" value={formatDate(customer.updatedAt)} />
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "contact" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Contact & Address</h2>
            {editMode ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextInput label="Email Address" value={email} onChange={setEmail} />
                <TextInput label="Phone Number" value={phone} onChange={setPhone} />
                <TextInput label="Country" value={country} onChange={setCountry} />
                <TextInput label="City" value={city} onChange={setCity} />
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1.5 block font-medium text-slate-700">Residential Address</span>
                  <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Email Address" value={email} href={email ? `mailto:${email}` : undefined} />
                <Field label="Phone Number" value={phone} href={phone ? `tel:${phone}` : undefined} />
                <Field label="Country" value={country} />
                <Field label="City" value={city} />
                <div className="md:col-span-2">
                  <Field label="Residential Address" value={address} />
                </div>
                <div className="md:col-span-2">
                  <Field label="Customer Notes" value={notes} />
                </div>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "measurements" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Measurements & Fit</h2>
            {measurementRows.length ? (
              <div className="mt-4 space-y-5">
                {measurementRows.map((row, index) => (
                  <MeasurementDisplayCard key={`${row.orderId ?? "measurement"}-${index}`} row={row} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Ruler className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-base font-bold text-slate-950">No measurements saved</h3>
                <p className="mt-1 text-sm text-slate-600">Saved customer tailoring measurements will appear here.</p>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "family" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Family & Group Orders</h2>
                <p className="mt-1 text-sm text-slate-600">Created family groups, selected outfits, progress, members, and saved member details.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{familyGroupRows.length} group{familyGroupRows.length === 1 ? "" : "s"}</span>
            </div>
            {familyGroupRows.length ? (
              <div className="mt-4 space-y-4">
                {familyGroupRows.map((group) => {
                  const expanded = expandedFamilyGroupId === group.id;
                  return (
                    <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setExpandedFamilyGroupId(expanded ? null : group.id)}
                        className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          {group.productImage ? (
                            <img src={group.productImage} alt="" className="h-16 w-14 rounded-xl object-cover" />
                          ) : (
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                              <Users className="h-6 w-6" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-950">{group.name}</p>
                              {group.paid ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Paid</span> : null}
                              {group.inCart && !group.paid ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">In cart</span> : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {[group.productName || "No outfit selected", group.eventName, `${group.memberCount} members`, `${group.readyMemberCount} ready`].filter(Boolean).join(" - ")}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="border-t border-slate-200 p-4">
                          <div className="grid gap-3 md:grid-cols-4">
                            <Field label="Current Step" value={`${group.currentStep} / 4`} />
                            <Field label="Selection" value={group.selectionType || "Not selected"} />
                            <Field label="Updated" value={formatDate(group.updatedAt)} />
                            <Field label="Order State" value={group.paid ? "Paid" : group.ordered ? "Ordered" : group.inCart ? "In cart" : "Draft"} />
                          </div>
                          <div className="mt-4 space-y-3">
                            {group.members.length ? group.members.map((member) => {
                              const memberExpanded = expandedFamilyMemberId === member.id;
                              const measurementCount = Object.values(member.values).filter(hasMeasurementValue).length;
                              return (
                                <div key={member.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFamilyMemberId(memberExpanded ? null : member.id)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-950">{member.label}</p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {[member.relation, member.age ? `Age ${member.age}` : null, member.gender, `${measurementCount} measurements`].filter(Boolean).join(" - ")}
                                      </p>
                                    </div>
                                    {memberExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  {memberExpanded ? <div className="border-t border-slate-200 p-4"><MeasurementDisplayCard row={member} compact /></div> : null}
                                </div>
                              );
                            }) : (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
                                No members have been added to this group yet.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-base font-bold text-slate-950">No family or group orders found</h3>
                <p className="mt-1 text-sm text-slate-600">Created family groups will appear here immediately, even before checkout.</p>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "events" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Event Participation</h2>
                <p className="mt-1 text-sm text-slate-600">Events this customer joined, with participant and order activity summarized.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{eventRows.length} event{eventRows.length === 1 ? "" : "s"}</span>
            </div>
            {eventRows.length ? (
              <div className="mt-4 space-y-4">
                {eventRows.map((event) => {
                  const expanded = expandedEventId === event.id;
                  return (
                    <div key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setExpandedEventId(expanded ? null : event.id)}
                        className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                            <CalendarDays className="h-6 w-6" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-slate-950">{event.name}</h3>
                              {event.eventCode ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">{event.eventCode}</span> : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {[event.productName || "No outfit selected", `${event.joinedCount} participants`, `${event.orderCount} orders`, `${event.paidCount} paid`].filter(Boolean).join(" - ")}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="border-t border-slate-200 p-4">
                          <div className="grid gap-3 md:grid-cols-4">
                            <Field label="Current Step" value={`${event.currentStep} / 4`} />
                            <Field label="Participants" value={String(event.joinedCount)} />
                            <Field label="Family Groups" value={String(event.familyGroupCount)} />
                            <Field label="Order Value" value={formatMoney(event.totalValue)} />
                          </div>
                          <div className="mt-5 grid gap-4 xl:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <h4 className="text-sm font-black text-slate-950">Participants</h4>
                              <div className="mt-3 divide-y divide-slate-100">
                                {event.participants.length ? event.participants.map((participant) => (
                                  <div key={String(participant.id ?? participant.participantEmail)} className="py-3 text-sm">
                                    <p className="font-bold text-slate-950">{String(participant.participantName ?? "Participant")}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {[participant.participantEmail, participant.orderStatus, participant.paymentStatus].filter(Boolean).join(" - ")}
                                    </p>
                                  </div>
                                )) : <p className="text-sm font-semibold text-slate-500">No participants joined yet.</p>}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <h4 className="text-sm font-black text-slate-950">Orders & Payment</h4>
                              <div className="mt-3 divide-y divide-slate-100">
                                {event.orders.length ? event.orders.map((order) => (
                                  <div key={String(order.id ?? order.orderNumber)} className="py-3 text-sm">
                                    <p className="font-bold text-slate-950">#{String(order.orderNumber ?? order.id ?? "").slice(0, 12).toUpperCase()}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {[order.status, order.paymentStatus, formatMoney(orderTotal(order)), formatDate(order.createdAt)].filter(Boolean).join(" - ")}
                                    </p>
                                  </div>
                                )) : <p className="text-sm font-semibold text-slate-500">No orders have been placed for this event yet.</p>}
                              </div>
                            </div>
                          </div>
                          {event.familyGroups.length ? (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                              <h4 className="text-sm font-black text-slate-950">Connected Family Groups</h4>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {event.familyGroups.map((group) => (
                                  <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="font-bold text-slate-950">{group.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {[group.productName || "No outfit selected", `${group.memberCount} members`, `${group.readyMemberCount} ready`].filter(Boolean).join(" - ")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-base font-bold text-slate-950">No event participation found</h3>
                <p className="mt-1 text-sm text-slate-600">Event details will appear after this customer joins or orders through an event.</p>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "orders" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Order History</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Total Orders" value={String(stats.totalOrders)} />
              <Field label="Lifetime Spend" value={formatMoney(stats.totalSpent)} />
              <Field label="Average Order" value={formatMoney(stats.averageOrder)} />
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Order</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Total</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customerOrders.length ? customerOrders.slice(0, 20).map((order) => (
                    <tr key={String(order.id ?? order.orderNumber)} className="text-sm font-semibold text-slate-700">
                      <td className="px-4 py-3">#{String(order.orderNumber ?? order.id ?? "").slice(0, 12).toUpperCase()}</td>
                      <td className="px-4 py-3">{String(order.status ?? "Not provided")}</td>
                      <td className="px-4 py-3">{formatMoney(orderTotal(order))}</td>
                      <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No orders found for this customer.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "documents" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">Documents & Attachments</h2>
              <p className="mt-1 text-sm text-slate-600">Download customer measurements, group measurement sheets, and the professional customer report.</p>
            </div>

            <div className="mt-5 space-y-4">
              <DocumentListRow title="Own Measurement Sheet" tags={["Required", "Measurements"]} status={accountOwnerMeasurement ? "Ready" : undefined}>
                {accountOwnerMeasurement ? (
                  <button
                    type="button"
                    onClick={() => downloadMeasurementPdf(datedPdfFilename(fullName, "Own Measurement Sheet"), "Own Measurement Sheet", [accountOwnerMeasurement], `Customer Name: ${fullName}`)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                ) : (
                  <span className="inline-flex h-9 items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-400">
                    Not available
                  </span>
                )}
              </DocumentListRow>

              <div className="rounded-2xl border border-slate-200 bg-slate-50">
                <DocumentListRow title="Group Measurement Sheet" tags={["Required", "Group", "Measurements"]} status={familyGroupRows.length ? `${familyGroupRows.length} groups` : undefined}>
                  <button
                    type="button"
                    onClick={() => setExpandedDocumentGroupId(expandedDocumentGroupId === "all-groups" ? null : "all-groups")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    aria-label="Show group measurement sheets"
                  >
                    {expandedDocumentGroupId === "all-groups" ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                  {familyGroupRows.length ? (
                    <button
                      type="button"
                      onClick={() => downloadGroupMeasurementPdf({
                        filename: datedPdfFilename(fullName, "All Group Measurement Sheets"),
                        customerName: fullName,
                        title: "Group Measurement Sheet",
                        groups: familyGroupRows,
                      })}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-400">
                      Not available
                    </span>
                  )}
                </DocumentListRow>

                {expandedDocumentGroupId === "all-groups" ? (
                  <div className="border-t border-slate-200 bg-white p-4">
                    {familyGroupRows.length ? (
                      <div className="space-y-3">
                        {familyGroupRows.map((group) => {
                          const memberMeasurements = group.members.filter((member) => Object.values(member.values).some(hasMeasurementValue));
                          return (
                            <div key={group.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-slate-950">{group.name}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {[group.productName || "No outfit selected", group.eventName, `${memberMeasurements.length} measurement sheets`, `${group.memberCount} members`].filter(Boolean).join(" - ")}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => downloadGroupMeasurementPdf({
                                    filename: datedPdfFilename(`${fullName} ${group.name}`, "Group Measurement Sheet"),
                                    customerName: fullName,
                                    title: "Group Measurement Sheet",
                                    groups: [group],
                                  })}
                                  disabled={!memberMeasurements.length}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Download className="h-4 w-4" /> Download
                                </button>
                              </div>
                              <div className="grid gap-0 divide-y divide-slate-100">
                                {group.members.length ? group.members.map((member) => {
                                  const hasValues = Object.values(member.values).some(hasMeasurementValue);
                                  const measurementCount = Object.values(member.values).filter(hasMeasurementValue).length;
                                  return (
                                    <div key={member.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1.3fr_1fr_auto] md:items-center">
                                      <div>
                                        <p className="font-bold text-slate-950">{member.label}</p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{[member.relation, member.age ? `Age ${member.age}` : null, member.gender].filter(Boolean).join(" - ") || "Group member"}</p>
                                      </div>
                                      <div className="text-xs font-semibold text-slate-500">{measurementCount} recorded measurements</div>
                                      <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-black", hasValues ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>
                                        {hasValues ? "Ready" : "Missing"}
                                      </span>
                                    </div>
                                  );
                                }) : (
                                  <div className="px-4 py-5 text-sm font-semibold text-slate-500">No members have been added to this group yet.</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-sm font-semibold text-slate-500">No group order measurements are available yet.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <DocumentListRow title="Customer Report" tags={["Report", "Orders", "Finance"]} status="Ready">
                <button
                  type="button"
                  onClick={() => downloadCustomerReportPdf({ customer, fullName, stats, orders: customerOrders, familyGroups: familyGroupRows, events: eventRows })}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              </DocumentListRow>
            </div>
          </section>
        ) : null}

        {activeSection === "account" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
            {editMode ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectInput label="Account Status" value={["active", "invited", "pending"].includes(accountStatus) ? accountStatus : "active"} onChange={setAccountStatus} options={[{ value: "active", label: "Active" }, { value: "invited", label: "Invited" }, { value: "pending", label: "Pending" }]} />
                <Field label="Password" value="Managed by reset workflow" />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Account Status" value={accountStatus} />
                <Field label="Latest Order" value={formatDate(stats.latestOrderDate)} />
                <Field label="Lifetime Spend" value={formatMoney(stats.totalSpent)} />
                <Field label="Average Order" value={formatMoney(stats.averageOrder)} />
                <Field label="Family Members" value={String(familyRows.length)} />
                <Field label="Events Joined" value={String(eventRows.length)} />
                <Field label="Password" value="Managed by reset workflow" />
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "notes" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Internal Notes</h2>
            {editMode ? (
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-700">
                {notes || "No internal notes recorded."}
              </div>
            )}
          </section>
        ) : null}
      </AdminDetailLayout>

      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          if (!next) {
            setResetFlowNotice(null);
            setNewPassword("");
            setConfirmPassword("");
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }
          setResetOpen(next);
        }}
      >
        {/* @ts-expect-error dialog primitive typing does not expose children in this mixed admin file */}
        <DialogContent className="max-w-md">
          {/* @ts-expect-error dialog primitive typing requires className in this mixed admin file */}
          <DialogHeader>
            {/* @ts-expect-error dialog primitive typing does not expose children in this mixed admin file */}
            <DialogTitle className="font-extrabold tracking-wide">RESET PASSWORD OPTIONS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {resetFlowNotice ? (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  resetFlowNotice.tone === "success"
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
                )}
                aria-live="polite"
              >
                {resetFlowNotice.message}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-900">Choose reset method</div>
              <div className="mt-2 space-y-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    resetMethod === "email_link" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="customer-reset-method"
                    checked={resetMethod === "email_link"}
                    onChange={() => setResetMethod("email_link")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Send Reset Link by Email{" "}
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Recommended
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      A secure password reset link will be sent to the customer&apos;s email address. The customer will create their own new password.
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    resetMethod === "temp_password" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="customer-reset-method"
                    checked={resetMethod === "temp_password"}
                    onChange={() => setResetMethod("temp_password")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Set Temporary Password <span className="ml-2 text-xs font-semibold text-slate-500">Admin Only</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">Set a temporary password. The customer must change it after signing in.</div>
                  </div>
                </label>
              </div>
            </div>

            {resetMethod === "email_link" ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetFlowNotice(null);
                    setNewPassword("");
                    setConfirmPassword("");
                    setResetOpen(false);
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendResetLink()}
                  disabled={busy}
                  className="inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </button>
              </div>
            ) : null}

            {resetMethod === "temp_password" ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">New Password</span>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    {[
                      { key: "minLength", label: "At least 8 characters", ok: passwordRules.minLength },
                      { key: "uppercase", label: "At least one uppercase letter", ok: passwordRules.uppercase },
                      { key: "lowercase", label: "At least one lowercase letter", ok: passwordRules.lowercase },
                      { key: "number", label: "At least one number", ok: passwordRules.number },
                      { key: "special", label: "At least one special character", ok: passwordRules.special },
                    ].map((rule) => (
                      <div key={rule.key} className={cn("flex items-center gap-2", rule.ok ? "text-emerald-700" : "text-slate-500")}>
                        {rule.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        <span className={cn(rule.ok ? "font-semibold" : "")}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Confirm Password</span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 ? (
                    doPasswordsMatch ? (
                      <span className="mt-1 block text-xs font-semibold text-emerald-700">Passwords match.</span>
                    ) : (
                      <span className="mt-1 block text-xs font-semibold text-rose-600">Passwords do not match.</span>
                    )
                  ) : null}
                </label>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetFlowNotice(null);
                      setNewPassword("");
                      setConfirmPassword("");
                      setResetOpen(false);
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetPassword()}
                    disabled={!canSubmitResetPassword}
                    className="inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Password
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
