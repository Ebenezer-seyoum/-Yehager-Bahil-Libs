"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
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
type FamilyDisplayRow = MeasurementDisplayRow & { id: string; relation: string; gender?: string; orderLabel?: string; eventName?: string };
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
type CustomerSectionId = "personal" | "contact" | "measurements" | "family" | "events" | "orders" | "account" | "notes";

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
      values,
      orderLabel: group?.groupName ? String(group.groupName) : undefined,
      eventName: hasMeasurementValue(group?.eventName) ? String(group?.eventName) : undefined,
      updatedAt: hasMeasurementValue(member.updatedAt) ? String(member.updatedAt) : undefined,
      meta: [member.gender, group?.groupName].filter(Boolean).join(" - "),
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
        values,
        orderId: order.id,
        orderLabel: order.orderNumber ? `Order #${order.orderNumber}` : undefined,
        eventName: hasMeasurementValue(order.eventName) ? String(order.eventName) : undefined,
        meta: [member.gender, order.orderNumber ? `Order #${order.orderNumber}` : null].filter(Boolean).join(" - "),
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
          values,
          updatedAt: hasMeasurementValue(member.updatedAt) ? String(member.updatedAt) : undefined,
          eventName: hasMeasurementValue(group.eventName) ? String(group.eventName) : undefined,
          meta: [member.gender, group.groupName].filter(Boolean).join(" - "),
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
  }, [activity?.orders, customer.email, customer.id, email, orders]);

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
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: [firstName, fatherName, grandfatherName].map((part) => part.trim()).filter(Boolean).join(" ") || fullName,
          email,
          phone,
          accountStatus,
          profile: {
            firstName,
            fatherName,
            grandfatherName,
            gender,
            dateOfBirth: dateOfBirth || null,
            country,
            city,
            address,
            notes,
          },
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      await dashboardSuccess("Customer Updated", "Customer profile saved successfully.");
      setEditMode(false);
      await refreshDetail();
      router.refresh();
    } catch (e) {
      await dashboardError("Update Failed", e instanceof Error ? e.message : "Unable to update customer.");
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
      title: isBlocked ? "Activate this customer?" : "Deactivate this customer?",
      text: isBlocked ? "Activating will restore customer account access." : "Deactivating will remove customer account access.",
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
        next === "active" ? "Customer Activated" : "Customer Deactivated",
        next === "active" ? "Customer account has been activated successfully." : "Customer account has been deactivated successfully.",
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
          await dashboardAlert("Cannot Delete Account", "This account can't be deleted because it has activity history. Please deactivate the account instead.", {
            icon: "warning",
            tone: "warning",
            confirmButtonText: "OK",
          });
          return;
        }
        throw new Error(message);
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
                        Edit
                      </button>
                      <button type="button" onClick={openResetPasswordModal} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#6D28D9] disabled:opacity-50">
                        <Lock className="h-4 w-4" />
                        Reset Password
                      </button>
                      <button type="button" onClick={() => void toggleActive()} disabled={busy} className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50", isBlocked ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#EA580C] hover:bg-[#C2410C]")}>
                        {isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {isBlocked ? "Activate" : "Deactivate"}
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
                  <span className="mb-1.5 block font-medium text-slate-700">Address</span>
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
                  <Field label="Delivery Address" value={address} />
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
                                        {[member.relation, member.gender, `${measurementCount} measurements`].filter(Boolean).join(" - ")}
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

        {activeSection === "account" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
            {editMode ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectInput label="Account Status" value={accountStatus} onChange={setAccountStatus} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "pending", label: "Pending" }]} />
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
