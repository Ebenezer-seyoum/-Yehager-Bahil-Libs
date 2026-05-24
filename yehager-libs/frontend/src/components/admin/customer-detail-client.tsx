"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Pencil, Trash2, Unlock, X } from "lucide-react";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Customer = Record<string, any>;

function formatDateTime(value?: string | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString();
}

function initials(name?: string | null, email?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email?.slice(0, 2)?.toUpperCase() || "—"
  );
}

function badgeTone(kind: "account" | "type", value?: string | null) {
  const v = String(value ?? "").toLowerCase();
  if (kind === "account") {
    if (v === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (v === "invited") return "bg-blue-100 text-blue-800 border-blue-200";
    if (v === "inactive" || v === "blocked" || v === "suspended") return "bg-slate-100 text-slate-800 border-slate-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  }
  if (kind === "type") {
    if (v === "vip") return "bg-purple-100 text-purple-800 border-purple-200";
    if (v === "wholesale") return "bg-amber-100 text-amber-800 border-amber-200";
    if (v === "returning") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const display = value && String(value).trim() ? value : "Not provided";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{display}</div>
    </div>
  );
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePhone(value: string) {
  return /^[+\d][\d\s-]{6,24}$/.test(value.trim());
}

function validateName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[\p{L}\s.'-]+$/u.test(trimmed);
}

export function CustomerDetailClient({
  initialCustomer,
  orders = [],
  backTab = "all",
  canEdit = true,
  canDelete = true,
  embedded = false,
  onClose,
}: {
  initialCustomer: Customer;
  orders?: Array<Record<string, unknown>>;
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

  const originalRef = useRef<Customer>(initialCustomer);

  const [firstName, setFirstName] = useState(String(customer.firstName ?? customer.first_name ?? ""));
  const [fatherName, setFatherName] = useState(String(customer.fatherName ?? customer.father_name ?? ""));
  const [grandfatherName, setGrandfatherName] = useState(String(customer.grandfatherName ?? customer.grandfather_name ?? ""));
  const [gender, setGender] = useState(String(customer.gender ?? ""));
  const [dateOfBirth, setDateOfBirth] = useState(String(customer.dateOfBirth ?? customer.date_of_birth ?? ""));

  const [email, setEmail] = useState(String(customer.email ?? ""));
  const [phone, setPhone] = useState(String(customer.phone ?? ""));
  const [country, setCountry] = useState(String(customer.country ?? ""));
  const [city, setCity] = useState(String(customer.city ?? ""));
  const [address, setAddress] = useState(String(customer.address ?? ""));

  const [accountStatus, setAccountStatus] = useState(String(customer.accountStatus ?? customer.account_status ?? customer.status ?? "active"));
  const [customerType, setCustomerType] = useState(String(customer.customerType ?? customer.customer_type ?? ""));
  const [notes, setNotes] = useState(String(customer.notes ?? ""));

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fullName = useMemo(() => {
    const composed = [firstName, fatherName, grandfatherName].map((s) => s.trim()).filter(Boolean).join(" ");
    return composed || String(customer.name ?? "Customer");
  }, [customer.name, firstName, fatherName, grandfatherName]);

  const stats = useMemo(() => {
    const emailKey = String(customer.email ?? "").toLowerCase();
    const customerOrders = orders.filter((o) => String((o as any).userEmail ?? (o as any).email ?? "").toLowerCase() === emailKey);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, o) => sum + Number((o as any).totalUsd ?? (o as any).total ?? 0), 0);
    const last = [...customerOrders].sort((a, b) => new Date(String((b as any).createdAt ?? 0)).getTime() - new Date(String((a as any).createdAt ?? 0)).getTime())[0] ?? null;
    return { customerOrders, totalOrders, totalSpent, lastOrderAt: last ? String((last as any).createdAt ?? "") : null };
  }, [customer.email, orders]);

  const photoUrl =
    customer.profile_photo_url ?? customer.profilePhotoUrl ?? customer.avatarUrl ?? null;

  async function refreshDetail() {
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) return;
      const next = json?.data?.user ?? json?.data ?? null;
      if (next) {
        setCustomer(next);
        originalRef.current = next;
      }
    } catch {
      // ignore
    }
  }

  async function save() {
    const trimmedFirst = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst) {
      await dashboardError("Validation Error", "First Name is required.");
      return;
    }
    if (!validateName(trimmedFirst) || (fatherName.trim() && !validateName(fatherName)) || (grandfatherName.trim() && !validateName(grandfatherName))) {
      await dashboardError("Validation Error", "Please use letters only for name fields.");
      return;
    }
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      await dashboardError("Validation Error", !trimmedEmail ? "Email Address is required." : "Please enter a valid email address.");
      return;
    }
    if (!trimmedPhone || !validatePhone(trimmedPhone)) {
      await dashboardError("Validation Error", !trimmedPhone ? "Phone Number is required." : "Please enter a valid phone number.");
      return;
    }
    if (!accountStatus) {
      await dashboardError("Validation Error", "Account Status is required.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirst,
          fatherName: fatherName.trim() || null,
          grandfatherName: grandfatherName.trim() || null,
          name: fullName,
          email: trimmedEmail,
          phone: trimmedPhone,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          country: country.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          accountStatus,
          customerType: customerType || null,
          notes: notes || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to update customer."));
      await dashboardSuccess("Customer Updated Successfully", "Customer information has been updated successfully.");
      setEditMode(false);
      await refreshDetail();
      router.refresh();
    } catch (e) {
      await dashboardError("Validation Error", e instanceof Error ? e.message : "Unable to update customer.");
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    const c = originalRef.current;
    setFirstName(String(c.firstName ?? c.first_name ?? ""));
    setFatherName(String(c.fatherName ?? c.father_name ?? ""));
    setGrandfatherName(String(c.grandfatherName ?? c.grandfather_name ?? ""));
    setGender(String(c.gender ?? ""));
    setDateOfBirth(String(c.dateOfBirth ?? c.date_of_birth ?? ""));
    setEmail(String(c.email ?? ""));
    setPhone(String(c.phone ?? ""));
    setCountry(String(c.country ?? ""));
    setCity(String(c.city ?? ""));
    setAddress(String(c.address ?? ""));
    setAccountStatus(String(c.accountStatus ?? c.account_status ?? c.status ?? "active"));
    setCustomerType(String(c.customerType ?? c.customer_type ?? ""));
    setNotes(String(c.notes ?? ""));
    setEditMode(false);
  }

  async function resetPassword() {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      await dashboardError("Validation Error", !newPassword.trim() ? "New password required" : "Confirm password required");
      return;
    }
    if (newPassword !== confirmPassword) {
      await dashboardError("Validation Error", "Password and confirm password do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to reset password."));
      await dashboardSuccess("Password Reset Successfully", "Customer password has been updated successfully.");
      setResetOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      await dashboardError("Validation Error", e instanceof Error ? e.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const current = String(accountStatus).toLowerCase();
    const next = current === "active" ? "inactive" : "active";
    const isDeactivate = next !== "active";
    const ok = await dashboardConfirm({
      title: isDeactivate ? "Deactivate Customer?" : "Activate Customer?",
      text: isDeactivate
        ? "This customer will no longer be able to access their account until reactivated."
        : "This customer will be able to access their account again.",
      confirmButtonText: isDeactivate ? "Yes, Deactivate" : "Yes, Activate",
      cancelButtonText: "Cancel",
      tone: isDeactivate ? "warning" : "success",
      icon: "warning",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to update status."));
      await dashboardSuccess(isDeactivate ? "Customer Deactivated" : "Customer Activated", `Customer account has been ${isDeactivate ? "deactivated" : "activated"} successfully.`);
      setAccountStatus(next);
      await refreshDetail();
      router.refresh();
    } catch (e) {
      await dashboardError("Validation Error", e instanceof Error ? e.message : "Unable to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
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
      const res = await fetch(`/api/backend/admin/users/${customer.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to delete customer."));
      await dashboardSuccess("Deleted Successfully", "Customer account has been deleted successfully.");
      if (embedded && onClose) onClose();
      router.push(`/admin/customers?tab=${encodeURIComponent(backTab)}&deleted=1`);
    } catch (e) {
      await dashboardError("Validation Error", e instanceof Error ? e.message : "Unable to delete customer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "space-y-3" : "mx-auto w-full max-w-screen-2xl space-y-4 pb-8"}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {photoUrl ? (
              <img src={String(photoUrl)} alt={fullName} className="h-16 w-16 rounded-2xl border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-base font-bold text-slate-700">
                {initials(fullName, email)}
              </div>
            )}
            <div>
              {!embedded ? (
                <Link href={`/admin/customers?tab=${encodeURIComponent(backTab)}`} className="text-xs font-semibold text-slate-600 hover:underline">
                  ← Back to Customers
                </Link>
              ) : null}
              <div className="mt-1 text-xl font-extrabold text-slate-950">{fullName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">ID:</span> {String(customer.id)}
                <span className="mx-1 text-slate-300">•</span>
                <span>{email || "Not provided"}</span>
                <span className="mx-1 text-slate-300">•</span>
                <span>{phone || "Not provided"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone("type", customerType)}`}>
                  {customerType ? String(customerType).toUpperCase() : "CUSTOMER"}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone("account", accountStatus)}`}>
                  {String(accountStatus || "—").toUpperCase()}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                  Total orders: {stats.totalOrders}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                  Total spent: ${Number(stats.totalSpent).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!editMode ? (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                disabled={!canEdit}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!canEdit || busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update Customer
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              <Lock className="h-4 w-4" /> Reset Password
            </button>
            <button
              type="button"
              onClick={() => void toggleActive()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              <Unlock className="h-4 w-4" />
              {String(accountStatus).toLowerCase() === "active" ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={!canDelete}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <main className="space-y-4 lg:col-span-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
            {!editMode ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Full Name" value={fullName} />
                <Field label="First Name" value={firstName} />
                <Field label="Father’s Name" value={fatherName} />
                <Field label="Grandfather’s Name" value={grandfatherName} />
                <Field label="Gender" value={gender || null} />
                <Field label="Date of Birth" value={dateOfBirth ? formatDate(dateOfBirth) : null} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">First Name <span className="text-rose-600">*</span></span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Father’s Name</span>
                  <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Grandfather’s Name</span>
                  <input value={grandfatherName} onChange={(e) => setGrandfatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Gender</span>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Not provided</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Date of Birth</span>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
            {!editMode ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Email" value={email} />
                <Field label="Phone" value={phone} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Email Address <span className="text-rose-600">*</span></span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Phone Number <span className="text-rose-600">*</span></span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Address Information</h2>
            {!editMode ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Country" value={country} />
                <Field label="City" value={city} />
                <Field label="Address" value={address} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Country</span>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
                <label className="block text-sm md:col-span-3">
                  <span className="mb-1.5 block font-medium text-slate-700">Address</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Account Information</h2>
            {!editMode ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Account Status" value={accountStatus} />
                <Field label="Customer Type" value={customerType} />
                <Field label="Invite Status" value={String(customer.inviteStatus ?? customer.invite_status ?? "Not provided")} />
                <Field label="Last Login" value={formatDateTime(String(customer.lastLoginAt ?? customer.last_login_at ?? ""))} />
                <Field label="Created Date" value={formatDateTime(String(customer.createdAt ?? customer.created_at ?? ""))} />
                <Field label="Updated Date" value={formatDateTime(String(customer.updatedAt ?? customer.updated_at ?? ""))} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Account Status <span className="text-rose-600">*</span></span>
                  <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700">Customer Type</span>
                  <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Not provided</option>
                    <option value="new">New</option>
                    <option value="returning">Returning</option>
                    <option value="vip">VIP</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Orders</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Total Orders" value={String(stats.totalOrders)} />
              <Field label="Total Spent" value={`$${Number(stats.totalSpent).toFixed(2)}`} />
              <Field label="Last Order Date" value={stats.lastOrderAt ? formatDate(stats.lastOrderAt) : "Not provided"} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Notes</h2>
            {!editMode ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {notes?.trim() ? notes : "No internal notes added."}
              </div>
            ) : (
              <label className="mt-3 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Internal admin notes</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </label>
            )}
          </section>
        </main>
      </div>

      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          if (!next) {
            setNewPassword("");
            setConfirmPassword("");
          }
          setResetOpen(next);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">New Password</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Confirm Password</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setResetOpen(false)} className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={() => void resetPassword()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reset Password
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

