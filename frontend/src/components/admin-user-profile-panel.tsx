"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Ruler, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function splitName(name?: string | null) {
  const parts = (name ?? "").split(" ").filter(Boolean);
  return {
    first: parts[0] ?? "",
    father: parts[1] ?? "",
    grandfather: parts.slice(2).join(" "),
  };
}

function SweetConfirm({
  title,
  message,
  confirmLabel,
  tone,
  action,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "warning" | "danger";
  action: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${tone === "danger" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
          !
        </div>
        <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">
            No, cancel
          </button>
          <form action={action}>
            <button className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white ${tone === "danger" ? "bg-red-600" : "bg-amber-500"}`}>
              {confirmLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminUserProfilePanel({
  user,
  backHref = "/admin/users",
  updateProfileAction,
  blockAction,
  resetPasswordAction,
  deleteAction,
}: {
  user: User;
  backHref?: string;
  updateProfileAction: (formData: FormData) => void;
  blockAction: () => void;
  resetPasswordAction: (formData: FormData) => void;
  deleteAction: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "roles">("overview");
  const [editing, setEditing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirm, setConfirm] = useState<"block" | "delete" | null>(null);
  const [overviewSection, setOverviewSection] = useState<"personal" | "address" | "account" | "orders" | "measurements">("personal");
  const nameParts = splitName(user.name);
  const overviewItems = [
    {
      key: "personal",
      label: "Personal Information",
      description: "Name, gender, birth, citizenship",
      icon: UserRound,
    },
    {
      key: "address",
      label: "Address Information",
      description: "Phone, region, zone, kebele",
      icon: MapPin,
    },
    {
      key: "account",
      label: "Account Information",
      description: "Login, status, registration",
      icon: ShieldCheck,
    },
    {
      key: "orders",
      label: "Order History",
      description: "Purchases and order activity",
      icon: ShoppingBag,
    },
    {
      key: "measurements",
      label: "Saved Measurements",
      description: "Tailoring measurement profile",
      icon: Ruler,
    },
  ] as const;
  const permissionGroups = [
    ["Dashboard", "Can view dashboard overview and workspace summary."],
    ["Users", "Can access user-related workspace information based on assigned role."],
    ["Orders", "Can view operational order information where permitted."],
    ["Catalog", "Can view product and catalog workspace information."],
    ["Reports", "Can access reporting areas when the role allows it."],
  ];

  return (
    <>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex flex-col gap-4 border-b border-border pb-5">
          <Link href={backHref} className="inline-flex w-fit rounded-xl border border-sidebar-border bg-sidebar px-4 py-2 text-sm font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent">
            ← Back
          </Link>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-secondary p-1 text-sm font-semibold">
            <button type="button" onClick={() => { setTab("overview"); setEditing(false); }} className={`rounded-xl px-4 py-2.5 ${tab === "overview" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              Overview
            </button>
            <button type="button" onClick={() => { setTab("roles"); setEditing(false); }} className={`rounded-xl px-4 py-2.5 ${tab === "roles" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              Roles & Permissions
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-3xl font-semibold">
              {initials(user.name, user.email)}
            </span>
            <div>
              <h1 className="text-3xl font-semibold">{user.name ?? "Unnamed user"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">ID Number: {user.id}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{user.status}</span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirm("block")} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
              Block
            </button>
            <button type="button" onClick={() => setResetOpen((value) => !value)} className="rounded-xl bg-sidebar px-4 py-2.5 text-sm font-semibold text-white">
              Reset Password
            </button>
            <button type="button" onClick={() => setConfirm("delete")} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
              Delete
            </button>
            {editing ? (
              <>
                <button form="user-profile-edit-form" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
                  Update
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
                  Cancel
                </button>
              </>
            ) : tab === "overview" && (overviewSection === "address" || overviewSection === "orders" || overviewSection === "measurements") ? null : (
              <button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
                Edit
              </button>
            )}
          </div>
        </div>

        {resetOpen ? (
          <form action={resetPasswordAction} className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row">
            <input name="password" type="password" minLength={8} required placeholder="New temporary password" className="h-11 flex-1 rounded-xl border border-input bg-background px-3" />
            <button className="rounded-xl bg-sidebar px-4 py-2.5 text-sm font-semibold text-white">Save Password</button>
          </form>
        ) : null}

        {tab === "overview" ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-border bg-background/60 p-4 shadow-sm">
              <p className="px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {user.role === "customer" ? "Customer Overview" : "Profile Overview"}
              </p>
              <div className="mt-3 space-y-2">
                {overviewItems.map(({ key, icon: Icon, label, description }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setOverviewSection(key as "personal" | "address" | "account" | "orders" | "measurements");
                      setEditing(false);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 ${
                      overviewSection === key ? "border-emerald-200 bg-emerald-50 shadow-sm" : "border-transparent bg-transparent"
                    }`}
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-extrabold ${overviewSection === key ? "bg-emerald-700 text-white" : "bg-secondary text-foreground group-hover:bg-blue-100"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-extrabold text-foreground">{label}</span>
                      {description ? <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{description}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-3xl border border-border bg-background/50 p-6 shadow-sm">
              {overviewSection === "personal" ? (
                <div>
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white"><UserRound className="h-6 w-6" /></span>
                    <div>
                      <h2 className="text-xl font-extrabold">Personal Information</h2>
                      <p className="text-sm text-muted-foreground">Customer identity and personal details.</p>
                    </div>
                  </div>
                  {editing ? (
                    <form id="user-profile-edit-form" action={updateProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold">First Name<input name="firstName" defaultValue={nameParts.first} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>
                      <label className="block text-sm font-semibold">Father&apos;s Name<input name="fatherName" defaultValue={nameParts.father} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>
                      <label className="block text-sm font-semibold">Grandfather&apos;s Name<input name="grandfatherName" defaultValue={nameParts.grandfather} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>
                      <label className="block text-sm font-semibold">Gender<select className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3"><option>Male</option><option>Female</option></select></label>
                      <label className="block text-sm font-semibold">Date of Birth<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="mm/dd/yyyy" /></label>
                      <label className="block text-sm font-semibold">Marital Status<select className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3"><option>Single</option><option>Married</option></select></label>
                      <label className="block text-sm font-semibold">Citizenship<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" defaultValue="Ethiopian" /></label>
                      <input name="email" type="hidden" defaultValue={user.email} />
                    </form>
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {[["Full Name", user.name ?? "Unnamed customer"], ["Gender", "-"], ["Date of Birth", "-"], ["Marital Status", "-"], ["Citizenship", "-"], ["Customer ID", user.id]].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-border bg-card p-4 transition hover:border-blue-200 hover:bg-blue-50"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold text-foreground">{value}</p></div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {overviewSection === "address" ? (
                <div>
                  <div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><MapPin className="h-6 w-6" /></span><div><h2 className="text-xl font-extrabold">Address Information</h2><p className="text-sm text-muted-foreground">Customer contact and location information.</p></div></div>
                  {editing ? (
                    <form id="user-profile-edit-form" action={updateProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
                      <input name="name" type="hidden" defaultValue={user.name ?? ""} /><input name="email" type="hidden" defaultValue={user.email} />
                      <label className="block text-sm font-semibold">Phone<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="Phone number" /></label>
                      <label className="block text-sm font-semibold">Region<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="Region" /></label>
                      <label className="block text-sm font-semibold">Zone<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="Zone" /></label>
                      <label className="block text-sm font-semibold">Woreda<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="Woreda" /></label>
                      <label className="block text-sm font-semibold">Kebele<input className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="Kebele" /></label>
                    </form>
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">{[["Phone", "-"], ["Email", user.email], ["Region", "-"], ["Zone", "-"], ["Woreda", "-"], ["Kebele", "-"]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-card p-4 transition hover:border-blue-200 hover:bg-blue-50"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold text-foreground">{value}</p></div>)}</div>
                  )}
                </div>
              ) : null}

              {overviewSection === "account" ? (
                <div>
                  <div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar text-white"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="text-xl font-extrabold">Account Information</h2><p className="text-sm text-muted-foreground">Current account state and access profile.</p></div></div>
                  {editing ? (
                    <form id="user-profile-edit-form" action={updateProfileAction} className="mt-5 grid gap-4 md:grid-cols-2">
                      <input name="name" type="hidden" defaultValue={user.name ?? ""} />
                      <label className="block text-sm font-semibold">Email / Username<input name="email" type="email" defaultValue={user.email} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>
                      <label className="block text-sm font-semibold">Role<input readOnly defaultValue={user.role} className="mt-1 h-11 w-full rounded-xl border border-input bg-secondary px-3 capitalize" /></label>
                      <label className="block text-sm font-semibold">Status<input readOnly defaultValue={user.status} className="mt-1 h-11 w-full rounded-xl border border-input bg-secondary px-3 capitalize" /></label>
                    </form>
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">{[["Username", user.email], ["Password", "Hidden for security"], ["Role", user.role], ["Status", user.status], ["Registration Date", formatDate(user.createdAt)], ["Last Login", formatDate(user.lastLoginAt)], ["Last Modified Date", "-"]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-card p-4 transition hover:border-blue-200 hover:bg-blue-50"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold text-foreground capitalize">{value}</p></div>)}</div>
                  )}
                </div>
              ) : null}

              {overviewSection === "orders" ? (
                <div><div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white"><ShoppingBag className="h-6 w-6" /></span><div><h2 className="text-xl font-extrabold">Order History</h2><p className="text-sm text-muted-foreground">Recent purchase activity for this customer.</p></div></div><div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-8 text-center transition hover:border-blue-200 hover:bg-blue-50"><ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 text-lg font-extrabold text-foreground">No orders yet</h3><p className="mt-1 text-sm text-muted-foreground">This customer has not placed any orders yet.</p></div></div>
              ) : null}

              {overviewSection === "measurements" ? (
                <div><div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><Ruler className="h-6 w-6" /></span><div><h2 className="text-xl font-extrabold">Saved Measurements</h2><p className="text-sm text-muted-foreground">Measurement profile used for tailoring.</p></div></div><div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-8 text-center transition hover:border-blue-200 hover:bg-blue-50"><Ruler className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 text-lg font-extrabold text-foreground">No saved measurements</h3><p className="mt-1 text-sm text-muted-foreground">This customer does not have saved tailoring measurements yet.</p></div></div>
              ) : null}
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="overflow-hidden rounded-2xl border border-border bg-background/50">
              <div className="border-b border-border bg-secondary/40 px-5 py-4">
                <h2 className="text-lg font-semibold">Permission List</h2>
                <p className="mt-1 text-sm text-muted-foreground">Professional overview of access areas connected to this user.</p>
              </div>
              <div className="divide-y divide-border">
                {permissionGroups.map(([label, description]) => (
                  <div key={label} className="grid gap-3 px-5 py-4 transition hover:bg-blue-50 sm:grid-cols-[220px_minmax(0,1fr)_120px] sm:items-center">
                    <div className="font-semibold">{label}</div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Allowed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {confirm === "block" ? (
        <SweetConfirm title="Block this user?" message={`${user.name ?? user.email} will be suspended and may lose access.`} confirmLabel="Yes, block" tone="warning" action={blockAction} onClose={() => setConfirm(null)} />
      ) : null}
      {confirm === "delete" ? (
        <SweetConfirm title="Delete this user?" message="This action cannot be undone." confirmLabel="Yes, delete" tone="danger" action={deleteAction} onClose={() => setConfirm(null)} />
      ) : null}
    </>
  );
}
