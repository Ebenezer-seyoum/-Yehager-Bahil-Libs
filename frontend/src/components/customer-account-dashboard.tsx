"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Ruler,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  User,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { customerToast } from "@/lib/customer-toast";
import {
  HEM_STYLE_OPTIONS,
  PANTS_MEASUREMENT_FIELDS,
  PANTS_MEASUREMENT_TITLE,
  PRESSING_STYLE_OPTIONS,
  TOP_MEASUREMENT_FIELDS,
  TOP_MEASUREMENT_TITLE,
  measurementDisplayGroups,
} from "@/lib/measurement-fields";

type Profile = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  mustChangePassword?: boolean | null;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  profileComplete?: boolean | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
};

type OrderItem = {
  productName?: string | null;
  product_name?: string | null;
  priceUsd?: number | string | null;
  price?: number | string | null;
};

type Order = {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentCurrency?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  createdAt?: string | null;
  shippingAddress?: { city?: string | null; country?: string | null } | null;
  items?: OrderItem[] | null;
  orderType?: string | null;
  familyGroupId?: string | null;
};

type Measurement = {
  id: string;
  label?: string | null;
  gender?: string | null;
  chest?: number | string | null;
  waist?: number | string | null;
  hips?: number | string | null;
  shoulderWidth?: number | string | null;
  armLength?: number | string | null;
  torsoLength?: number | string | null;
  inseam?: number | string | null;
  neck?: number | string | null;
  bicepCircumference?: number | string | null;
  wristCircumference?: number | string | null;
  pantsWaist?: number | string | null;
  pantsHip?: number | string | null;
  thighCircumference?: number | string | null;
  waistToPantsLength?: number | string | null;
  hemStyle?: string | null;
  pressingStyle?: string | null;
};

type ServerAction = (formData: FormData) => void | Promise<void>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Order Received", color: "bg-yellow-100 text-yellow-800" },
  tailoring: { label: "In Tailoring", color: "bg-purple-100 text-purple-800" },
  quality_check: { label: "Quality Check", color: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", color: "bg-green-100 text-green-800" },
  delivered: { label: "Delivered", color: "bg-green-200 text-green-900" },
  ready_for_pickup: { label: "Ready for Pickup", color: "bg-orange-100 text-orange-800" },
  picked_up: { label: "Picked Up", color: "bg-green-200 text-green-900" },
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatMoney(order: Order) {
  if (order.paymentCurrency === "ETB" && order.totalEtb) return `${Number(order.totalEtb).toLocaleString()} ETB`;
  return `$${Number(order.totalUsd ?? 0).toFixed(2)}`;
}

function orderItemPrice(item: OrderItem) {
  const value = Number(item.priceUsd ?? item.price ?? 0);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "$0.00";
}

function getOrderTypeShortName(order: Order) {
  const isGroup = Boolean(order.familyGroupId || (order as any).groupId || order.orderType === "group_order");
  const isCustom = (order.orderType === "custom_design_order") || order.items?.some(item => (item as any).type === "custom_design" || (item as any).isCustom);
  
  if (isGroup) {
    return isCustom ? "GRP-CUSTOM" : "GRP-CATALOG";
  }
  return isCustom ? "IND-CUSTOM" : "IND-CATALOG";
}

export function CustomerAccountDashboard({
  profile,
  orders,
  measurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
}: {
  profile: Profile;
  orders: Order[];
  measurements: Measurement[];
  createMeasurement: ServerAction;
  updateMeasurement: ServerAction;
  deleteMeasurement: ServerAction;
}) {
  const mustChangePassword = Boolean(profile.mustChangePassword);
  const searchParams = useSearchParams();
  const router = useRouter();
  const mustCompleteProfile = profile.role === "customer" && profile.profileComplete === false;
  const [tab, setTab] = useState(mustChangePassword ? "security" : "profile");
  const [editingProfile, setEditingProfile] = useState(mustCompleteProfile || searchParams?.get("completeProfile") === "1");
  const [profileForm, setProfileForm] = useState({
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    notes: profile.notes ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const displayName = profile.name ?? "Customer";
  const email = profile.email ?? "";
  const initials = displayName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || "?";
  const checkoutPrompt = searchParams?.get("checkout");

  useEffect(() => {
    if (mustCompleteProfile || checkoutPrompt === "profile_required") {
      customerToast(
        "Please complete your account details before checkout.",
        "Full name, phone / WhatsApp, and residential address are required.",
      );
    }
  }, [mustCompleteProfile, checkoutPrompt]);

  async function saveProfile() {
    if (!profileForm.name.trim() || !profileForm.phone.trim() || !profileForm.address.trim()) {
      customerToast("Full name, phone / WhatsApp, and residential address are required.");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch("/api/backend/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          address: profileForm.address,
          country: profileForm.country || null,
          city: profileForm.city || null,
          notes: profileForm.notes || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Could not save profile.");
      customerToast("Account details saved successfully.", undefined, "success");
      setEditingProfile(false);
      if (checkoutPrompt === "profile_required") {
        window.setTimeout(() => {
          router.refresh();
          router.replace("/cart");
        }, 800);
      } else {
        router.replace("/my-account");
        router.refresh();
      }
    } catch (error) {
      customerToast(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  const tabs = [
    { key: "profile", label: "My Profile", icon: User },
    { key: "orders", label: "My Orders", icon: ShoppingBag },
    { key: "status", label: "My Status", icon: Scissors },
    { key: "events", label: "Events & Groups", icon: CalendarDays },
    { key: "measurements", label: "Measurements", icon: Ruler },
    { key: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {mustChangePassword ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Password reset required</p>
          <p className="mt-0.5">Your password was reset. Please change it now to continue using your account securely.</p>
        </div>
      ) : null}
      <div className="mb-8 rounded-2xl bg-foreground p-6 text-background sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <span className="font-heading text-xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.3em] text-primary">My Account</p>
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">{displayName}</h1>
              <p className="text-sm text-background/60">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/catalog" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <ShoppingBag className="h-3.5 w-3.5" /> Shop Now
            </Link>
            <button type="button" onClick={() => { window.location.replace("/api/logout"); }} className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "In Production", value: orders.filter((order) => ["tailoring", "quality_check"].includes(order.status ?? "")).length },
            { label: "Delivered", value: orders.filter((order) => order.status === "delivered").length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/10 p-3 text-center">
              <p className="font-heading text-2xl font-bold">{value}</p>
              <p className="mt-0.5 text-xs text-background/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-secondary/40 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              tab === key ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="hidden h-4 w-4 sm:block" />
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Personal Information</h2>
              {!editingProfile ? (
                <button type="button" onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary">
                  <User className="h-3.5 w-3.5" /> Edit Profile
                </button>
              ) : null}
            </div>

            {/* Profile Avatar + Identity */}
            <div className="mb-6 flex items-center gap-4 rounded-xl bg-secondary/40 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary">
                <span className="font-heading text-2xl font-bold text-primary-foreground">{initials}</span>
              </div>
              <div>
                <p className="text-lg font-bold">{displayName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold capitalize text-green-800">{profile.status ?? "active"}</span>
              </div>
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name *</span>
                  <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone / WhatsApp *</span>
                  <input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+251..." className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residential Address *</span>
                  <textarea value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</span>
                    <input value={profileForm.country} onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City</span>
                    <input value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional Notes</span>
                  <textarea value={profileForm.notes} onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => void saveProfile()} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    <Check className="h-3.5 w-3.5" /> {savingProfile ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingProfile(false)} disabled={mustCompleteProfile} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: User, label: "Full Name", value: displayName },
                  { icon: Mail, label: "Email Address", value: email },
                  { icon: Phone, label: "Phone / WhatsApp", value: profile.phone || "Not set" },
                  { icon: MapPin, label: "Residential Address", value: profile.address || "Not set" },
                  { icon: MapPin, label: "City / Country", value: [profile.city, profile.country].filter(Boolean).join(", ") || "Not set" },
                  { icon: ShieldCheck, label: "Account Status", value: profile.status ?? "active" },
                  { icon: CalendarDays, label: "Member Since", value: formatDate(profile.createdAt) || "—" },
                  { icon: RefreshCw, label: "Last Login", value: formatDate(profile.lastLoginAt) || "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold capitalize">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading mb-4 font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { href: "/catalog", icon: ShoppingBag, title: "Browse & Order", desc: "Explore new catalog items" },
                { href: "/tailoring-status", icon: Scissors, title: "Track Tailoring", desc: "Live production updates" },
                { href: "/events", icon: CalendarDays, title: "Events & Groups", desc: "Manage shared ordering" },
              ].map(({ href, icon: Icon, title, desc }) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/40 hover:bg-secondary/30">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
              <button type="button" onClick={() => setTab("security")} className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-primary/40 hover:bg-secondary/30">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your credentials</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "orders" ? <OrdersPanel orders={orders} /> : null}
      {tab === "status" ? <StatusPanel orders={orders} /> : null}
      {tab === "events" ? <EventsPanel /> : null}
      {tab === "measurements" ? (
        <MeasurementsPanel measurements={measurements} createMeasurement={createMeasurement} updateMeasurement={updateMeasurement} deleteMeasurement={deleteMeasurement} />
      ) : null}
      {tab === "security" ? <SecurityPanel email={email} /> : null}
    </div>
  );
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border py-20 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-heading mb-1 text-lg font-semibold">No orders yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">Browse the collection and place your first order.</p>
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse Catalog</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{orders.length} order(s) total</p>
        <Link href="/catalog" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <ShoppingBag className="h-3.5 w-3.5" /> Place New Order
        </Link>
      </div>
      {orders.map((order) => {
        const cfg = STATUS_CONFIG[order.status ?? "pending"] ?? STATUS_CONFIG.pending;
        return (
          <div key={order.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold">{order.orderNumber ?? order.id}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${order.orderType === "custom_design_order" ? "bg-primary/20 text-primary border border-primary/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                  {getOrderTypeShortName(order)}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              </div>
            </div>

            {order.paymentStatus === "pending" || order.paymentStatus === "unpaid" ? (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-500 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Action Required: Outstanding Payment. Please contact support or check your email for payment link.</span>
              </div>
            ) : order.paymentStatus === "awaiting_verification" ? (
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs font-bold text-blue-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Payment under verification. Our team is reviewing your proof of payment.</span>
              </div>
            ) : null}

            <div className="mb-3 space-y-1">
              {(order.items ?? []).map((item, index) => (
                <div key={`${order.id}-${index}`} className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>{item.productName ?? item.product_name ?? "Item"}</span>
                  <span>{orderItemPrice(item)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-bold">{formatMoney(order)}</span>
              <Link href="/tailoring-status" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Track Progress <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {order.shippingAddress?.city ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {order.shippingAddress.city}, {order.shippingAddress.country}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StatusPanel({ orders }: { orders: Order[] }) {
  const steps = ["pending", "tailoring", "quality_check", "shipped", "delivered"];
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-20 text-center">
        <Scissors className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-heading mb-1 text-lg font-semibold">No active orders</h3>
        <p className="mb-4 text-sm text-muted-foreground">Place an order to track tailoring progress here.</p>
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse Catalog</Link>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="divide-y divide-border">
        {orders.map((order) => {
          const cfg = STATUS_CONFIG[order.status ?? "pending"] ?? STATUS_CONFIG.pending;
          const stepIndex = Math.max(0, steps.indexOf(order.status ?? "pending"));
          return (
            <div key={order.id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold">{order.orderNumber ?? order.id}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="mb-2 flex items-center gap-1">
                {steps.map((step, index) => <div key={step} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-primary" : "bg-border"}`} />)}
              </div>
              <div className="mb-3 flex justify-between text-[10px] text-muted-foreground">
                {["Received", "Tailoring", "QC", "Shipped", "Delivered"].map((label) => <span key={label}>{label}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">Events &amp; Group Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the shared-order experience that fits your needs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/events" className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
            <CalendarDays className="h-3.5 w-3.5" /> View Events
          </Link>
          <Link href="/group-orders" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Users className="h-3.5 w-3.5" /> Group Orders
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <Link href="/events" className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/60 hover:bg-secondary/30">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Event Match-Up</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a shareable event link. Guests join, add their own family, and place their own orders.</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link href="/group-orders" className="group flex w-full items-center gap-4 rounded-2xl border border-primary/60 bg-card p-6 text-left transition-all hover:bg-primary/5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Private Group Order</p>
            <p className="mt-1 text-sm text-muted-foreground">Add family members and measurements yourself, then pay for everyone in one checkout.</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

    </div>
  );
}

function DashboardMeasurementInput({
  name,
  label,
  hint,
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: number | string | null;
}) {
  const numericDefault = defaultValue !== undefined && defaultValue !== null && defaultValue !== "" ? Number(defaultValue) : undefined;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-400">
        {label}{" "}
        {required ? (
          <span className="text-[#f5a623]">*</span>
        ) : (
          <span className="font-normal italic text-zinc-500">(optional)</span>
        )}
      </span>
      <span className="relative block">
        <input
          name={name}
          type="number"
          min="0.1"
          step="0.1"
          required={required}
          defaultValue={numericDefault}
          placeholder="0.0"
          className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-lg text-blue-200 outline-none transition focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623]/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#f5a623]">cm</span>
      </span>
      {hint ? <span className="mt-1 block text-[12px] leading-snug text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function ChoiceCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-28 rounded-xl border-2 p-4 text-left transition-all ${
        selected ? "border-[#f5a623] bg-[#f5a623]/5" : "border-white/5 bg-[#1a1a1a] hover:border-white/10"
      }`}
    >
      <span className={`block text-sm font-bold ${selected ? "text-[#f5a623]" : "text-white"}`}>{title}</span>
      <span className="mt-2 block text-xs leading-relaxed text-zinc-400">{description}</span>
    </button>
  );
}

function MeasurementEditForm({
  m,
  action,
  hemStyle,
  setHemStyle,
  pressingStyle,
  setPressingStyle,
  onComplete
}: {
  m?: Measurement;
  action: ServerAction;
  hemStyle: string;
  setHemStyle: (val: string) => void;
  pressingStyle: string;
  setPressingStyle: (val: string) => void;
  onComplete: () => void;
}) {
  const router = useRouter();
  const [isPantsOpen, setIsPantsOpen] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async (fd: FormData) => {
    const mandatoryFields = ["neck", "shoulderWidth", "chest", "waist", "torsoLength", "armLength"];
    const missing = mandatoryFields.filter(f => !fd.get(f) || fd.get(f) === "" || fd.get(f) === "0");

    if (missing.length > 0) {
      customerToast("Please insert all mandatory measurement inputs.");
      scrollToTop();
      return;
    }

    try {
      fd.set("hemStyle", hemStyle);
      fd.set("pressingStyle", pressingStyle);
      await action(fd);
      router.refresh();
      customerToast("Measurements saved successfully.", undefined, "success");
      scrollToTop();
      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch {
      customerToast("Failed to save measurements. Please try again.");
      scrollToTop();
    }
  };

  return (
    <div ref={topRef} className="relative">
      <form action={handleSubmit} className="space-y-8">
      {m?.id ? <input type="hidden" name="measurementId" value={m.id} /> : null}

      <div className="rounded-2xl border border-white/5 bg-[#141414] p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">👔</span>
          <div>
            <h3 className="text-base font-bold text-[#f5a623]">{TOP_MEASUREMENT_TITLE}</h3>
            <p className="text-xs text-zinc-500">Measurements for the top garment</p>
          </div>
        </div>
        <div className="h-px bg-white/5 mb-5" />
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          {TOP_MEASUREMENT_FIELDS.map((field) => (
            <DashboardMeasurementInput key={field.key} name={field.key} label={field.label} hint={field.hint} required={field.required !== false} defaultValue={(m as any)?.[field.key]} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#141414] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsPantsOpen(!isPantsOpen)}
          className="flex w-full cursor-pointer items-center justify-between p-6 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👖</span>
            <span className="text-base font-bold text-white">{PANTS_MEASUREMENT_TITLE}</span>
          </div>
          <div className="rounded-full bg-white/5 p-2 transition-transform duration-200">
            <ChevronDown className={`h-5 w-5 text-zinc-400 ${isPantsOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {isPantsOpen && (
          <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300">
            <div className="h-px bg-white/5 mb-5" />
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {PANTS_MEASUREMENT_FIELDS.map((field) => (
                <DashboardMeasurementInput key={field.key} name={field.key} label={field.label} hint={field.hint} required={field.required !== false} defaultValue={(m as any)?.[field.key]} />
              ))}
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-3">Hem Style <span className="text-[#f5a623]">*</span></p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {HEM_STYLE_OPTIONS.map((option) => (
                    <ChoiceCard key={option.value} title={option.title} description={option.description} selected={hemStyle === option.value} onClick={() => setHemStyle(option.value)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-3">Pressing (Iron) Style <span className="text-[#f5a623]">*</span></p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PRESSING_STYLE_OPTIONS.map((option) => (
                    <ChoiceCard key={option.value} title={option.title} description={option.description} selected={pressingStyle === option.value} onClick={() => setPressingStyle(option.value)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" className="h-13 flex-1 rounded-xl bg-[#f5a623] px-6 py-3.5 text-base font-bold text-black transition-transform hover:scale-[1.01] active:scale-95">
          {m?.id ? "Update Measurements" : "Save Measurements"}
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="h-13 rounded-xl border border-white/10 px-6 py-3.5 text-base font-bold text-white hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
      </form>
    </div>
  );
}

function MeasurementsPanel({
  measurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
}: {
  measurements: Measurement[];
  createMeasurement: ServerAction;
  updateMeasurement: ServerAction;
  deleteMeasurement: ServerAction;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hemStyle, setHemStyle] = useState("Straight");
  const [pressingStyle, setPressingStyle] = useState("Creased");

  const hasMeasurement = measurements.length > 0;

  function beginEdit(m: Measurement) {
    setHemStyle(String(m.hemStyle || (m as any).hem_style || "Straight"));
    setPressingStyle(String(m.pressingStyle || (m as any).pressing_style || "Creased"));
    setEditingId(m.id);
  }

  function beginAdd() {
    setHemStyle("Straight");
    setPressingStyle("Creased");
    setShowAddForm(true);
  }

  // When fresh data arrives (after router.refresh), automatically switch to the saved view
  useEffect(() => {
    if (hasMeasurement) {
      setShowAddForm(false);
      setEditingId(null);
    }
  }, [measurements.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ruler className="h-6 w-6 text-[#f5a623]" />
          <h2 className="text-2xl font-bold text-foreground">Measurements</h2>
        </div>
      </div>
      {editingId ? (
        // EDIT MODE: Show ONLY the form for the selected measurement
        measurements.filter(m => m.id === editingId).map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Editing: {m.label ?? "My Measurements"}</p>
                <p className="text-sm capitalize text-muted-foreground">{m.gender ?? "female"}</p>
              </div>
              <span className="rounded-full bg-blue-900/40 px-3 py-1 text-xs font-semibold text-blue-400 font-mono tracking-tighter">ID: {m.id.split('-')[0]}</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-4">
                <p className="font-bold text-[#f5a623]">Please measure in centimeters (cm) only.</p>
                <p className="mt-1 text-sm text-zinc-400">Do not use inches — update all values in CM for a perfect fit.</p>
              </div>
              <MeasurementEditForm 
                m={m} 
                action={updateMeasurement}
                hemStyle={hemStyle} 
                setHemStyle={setHemStyle} 
                pressingStyle={pressingStyle} 
                setPressingStyle={setPressingStyle}
                onComplete={() => setEditingId(null)}
              />
            </div>
          </div>
        ))
      ) : showAddForm || !hasMeasurement ? (
        // ADD MODE: Show ONLY the add form
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">{showAddForm ? "Add New Measurement Set" : "Add Your Measurements"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Enter your measurements once. They will be saved for all future orders.</p>
            </div>
            {hasMeasurement && (
              <button onClick={() => setShowAddForm(false)} className="text-sm font-bold text-zinc-500 hover:text-white">
                Cancel
              </button>
            )}
          </div>
          <div className="mb-6 rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-4">
            <p className="font-bold text-[#f5a623]">Please measure in centimeters (cm) only.</p>
            <p className="mt-1 text-sm text-zinc-400">Do not use inches — all values must be entered in CM for a perfect fit.</p>
          </div>
          <MeasurementEditForm 
            action={createMeasurement} 
            hemStyle={hemStyle} 
            setHemStyle={setHemStyle} 
            pressingStyle={pressingStyle} 
            setPressingStyle={setPressingStyle} 
            onComplete={() => setShowAddForm(false)} 
          />
        </div>
      ) : (
        // LIST MODE: Show summary boxes
        <div className="space-y-6">
          {hasMeasurement && !showAddForm && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={beginAdd}
                className="inline-flex items-center gap-2 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/10 px-4 py-2 text-sm font-bold text-[#f5a623] hover:bg-[#f5a623]/20"
              >
                + Add Another Profile
              </button>
            </div>
          )}
          {measurements.map((m) => (
            <div key={m.id} className="rounded-3xl border border-white/5 bg-[#141414] p-8 shadow-2xl transition-all hover:border-white/10">
              <div className="mb-10 flex items-start justify-between">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#f5a623]">Saved Profile</p>
                  <h3 className="text-3xl font-bold tracking-tight text-white">{m.label ?? "My Measurements"}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => beginEdit(m)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/5 px-5 py-2.5 text-sm font-bold text-[#f5a623] transition-all hover:bg-[#f5a623]/10 hover:border-[#f5a623]/40 active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="space-y-8">
                {measurementDisplayGroups(m as any).filter((group) => group.title !== "Profile").map((group) => (
                  <div key={group.title}>
                    <h4 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#f5a623]">{group.title}</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
                      {group.fields.map(([label, value]) => (
                        <div key={label} className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                          <p className="text-2xl font-bold text-white">
                            {value !== undefined && value !== null && value !== "" ? (
                              <>
                                {typeof value === "number" ? value.toFixed(1) : value}
                                {typeof value === "number" && <span className="ml-1 text-lg font-medium text-zinc-400">cm</span>}
                              </>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <form action={deleteMeasurement} className="mt-12 flex items-center justify-between border-t border-white/5 pt-6">
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Profile ID: {m.id.split('-')[0]}</p>
                 <button type="submit" className="text-[11px] font-black uppercase tracking-widest text-red-900/40 transition-colors hover:text-red-500/80">
                   Delete Profile
                 </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityPanel({ email }: { email: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-heading mb-5 text-lg font-semibold">Account Security</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Lock className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Reset Password</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Use the sign-in page password reset flow to set a new password.</p>
            </div>
            <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Link>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Mail className="h-4 w-4 text-muted-foreground" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Account Email</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Your current email: <strong>{email}</strong></p>
              <p className="mt-1 text-xs text-muted-foreground">To change your email, contact support@yehagerbahillibs.com.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-destructive/20 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10"><LogOut className="h-4 w-4 text-destructive" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Sign Out</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Sign out of your account on this device.</p>
            </div>
            <button type="button" onClick={() => { window.location.replace("/api/logout"); }} className="shrink-0 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
