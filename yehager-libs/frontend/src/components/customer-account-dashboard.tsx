"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Ruler,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

type Profile = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  phone?: string | null;
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
};

type Event = {
  id: string;
  name?: string | null;
  eventCode?: string | null;
  eventDate?: string | null;
  productName?: string | null;
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

export function CustomerAccountDashboard({
  profile,
  orders,
  events,
  measurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
}: {
  profile: Profile;
  orders: Order[];
  events: Event[];
  measurements: Measurement[];
  createMeasurement: ServerAction;
  updateMeasurement: ServerAction;
  deleteMeasurement: ServerAction;
}) {
  const [tab, setTab] = useState("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const displayName = profile.name ?? "Customer";
  const email = profile.email ?? "";
  const initials = displayName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || "?";

  const tabs = [
    { key: "profile", label: "My Profile", icon: User },
    { key: "orders", label: "My Orders", icon: ShoppingBag },
    { key: "status", label: "My Status", icon: Scissors },
    { key: "events", label: "My Events", icon: CalendarDays },
    { key: "measurements", label: "Measurements", icon: Ruler },
    { key: "security", label: "Security", icon: Lock },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
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
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
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
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Personal Information</h2>
              {!editingProfile ? (
                <button type="button" onClick={() => setEditingProfile(true)} className="text-sm text-primary hover:underline">
                  Edit
                </button>
              ) : null}
            </div>
            {editingProfile ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Full Name</span>
                  <p className="mt-1 text-sm italic text-muted-foreground">Name changes require contacting support.</p>
                  <input value={displayName} disabled className="mt-1 h-10 w-full cursor-not-allowed rounded-lg border border-input bg-background px-3 text-sm opacity-50" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Phone Number</span>
                  <input value={profile.phone ?? ""} disabled placeholder="Contact support to update phone" className="mt-1 h-10 w-full cursor-not-allowed rounded-lg border border-input bg-background px-3 text-sm opacity-60" />
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setEditingProfile(false)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                    <Check className="h-3.5 w-3.5" /> Done
                  </button>
                  <button type="button" onClick={() => setEditingProfile(false)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { icon: User, label: "Full Name", value: displayName },
                  { icon: Mail, label: "Email", value: email },
                  { icon: Phone, label: "Phone", value: profile.phone || "Not set" },
                  { icon: ShieldCheck, label: "Account Status", value: profile.status ?? "active" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium capitalize">{value}</p>
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
                { href: "/catalog", icon: ShoppingBag, title: "Browse & Order", desc: "Explore new collections" },
                { href: "/tailoring-status", icon: Scissors, title: "Track Tailoring", desc: "Live production updates" },
                { href: "/events", icon: CalendarDays, title: "Event Groups", desc: "Manage group orders" },
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
      {tab === "events" ? <EventsPanel events={events} /> : null}
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
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse Collection</Link>
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
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            </div>
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
        <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Browse Collection</Link>
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

function EventsPanel({ events }: { events: Event[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your event groups and participation</p>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Browse Events
        </Link>
      </div>
      {events.length === 0 ? (
        <Link href="/events" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Event Groups</p>
            <p className="text-xs text-muted-foreground">View and manage your event participations</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        events.map((event) => (
          <Link key={event.id} href={`/event/${event.id}`} className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <div>
              <h3 className="font-heading font-semibold">{event.name}</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {event.eventCode ? <span className="font-mono">{event.eventCode}</span> : null}
                {event.eventDate ? <span>{formatDate(event.eventDate)}</span> : null}
                {event.productName ? <span>{event.productName}</span> : null}
              </div>
            </div>
            <span className="text-xs text-primary group-hover:underline">View Dashboard -&gt;</span>
          </Link>
        ))
      )}
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
  const fields = [
    { key: "chest", label: "Chest", optional: false },
    { key: "waist", label: "Waist", optional: false },
    { key: "hips", label: "Hips", optional: false },
    { key: "shoulderWidth", label: "Shoulder Width", optional: false },
    { key: "armLength", label: "Arm Length", optional: false },
    { key: "torsoLength", label: "Torso Length", optional: false },
    { key: "inseam", label: "Inseam", optional: true },
    { key: "neck", label: "Neck", optional: true },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-primary">Add Measurements</p>
        <form action={createMeasurement} className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2"><span className="mb-1 block text-muted-foreground">Label</span><input name="label" defaultValue="My Measurements" className="h-10 w-full rounded-md border border-input bg-background px-3" /></label>
          <label className="col-span-2"><span className="mb-1 block text-muted-foreground">Gender</span><select name="gender" defaultValue="female" className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="female">female</option><option value="male">male</option><option value="unisex">unisex</option></select></label>
          {fields.map((field) => (
            <label key={field.key}>
              <span className="mb-1 block text-muted-foreground">{field.label}</span>
              <input name={field.key} type="number" step="0.01" required={!field.optional} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
          ))}
          <button type="submit" className="col-span-2 mt-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save Measurement</button>
        </form>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-primary">My Measurements</p>
        <div className="mt-4 space-y-3">
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No measurements yet.</p>
          ) : (
            measurements.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <form action={updateMeasurement} className="grid grid-cols-2 gap-2 text-sm">
                  <input type="hidden" name="measurementId" value={m.id} />
                  <label className="col-span-2 block text-sm"><span className="mb-1 block text-muted-foreground">Label</span><input name="label" defaultValue={m.label ?? "My Measurements"} className="h-9 w-full rounded-md border border-input bg-background px-3" /></label>
                  <label className="col-span-2 block text-sm"><span className="mb-1 block text-muted-foreground">Gender</span><select name="gender" defaultValue={m.gender ?? "female"} className="h-9 w-full rounded-md border border-input bg-background px-3"><option value="female">female</option><option value="male">male</option><option value="unisex">unisex</option></select></label>
                  {fields.map((field) => (
                    <label key={field.key} className="block text-sm">
                      <span className="mb-1 block text-muted-foreground">{field.label}</span>
                      <input
                        name={field.key}
                        type="number"
                        step="0.01"
                        defaultValue={m[field.key] ?? ""}
                        required={!field.optional}
                        className="h-9 w-full rounded-md border border-input bg-background px-3"
                      />
                    </label>
                  ))}
                  <button type="submit" className="col-span-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">Update</button>
                </form>
                <form action={deleteMeasurement} className="mt-2">
                  <input type="hidden" name="measurementId" value={m.id} />
                  <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive">Delete</button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
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
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="shrink-0 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
