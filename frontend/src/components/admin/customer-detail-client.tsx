"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Loader2, 
  Lock, 
  MapPin, 
  NotebookPen, 
  Pencil, 
  ShoppingBag, 
  Trash2, 
  Unlock, 
  User2, 
  X,
  RefreshCw,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { cn } from "@/lib/utils";

type Customer = Record<string, any>;

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
    if (v === "active") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (v === "invited") return "bg-blue-50 text-blue-700 border-blue-100";
    if (v === "inactive" || v === "blocked" || v === "suspended") return "bg-slate-50 text-slate-700 border-slate-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  }
  if (kind === "type") {
    if (v === "vip") return "bg-purple-50 text-purple-700 border-purple-100";
    if (v === "wholesale") return "bg-amber-50 text-amber-700 border-amber-100";
    if (v === "returning") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    return "bg-blue-50 text-blue-700 border-blue-100";
  }
  return "bg-slate-50 text-slate-700 border-slate-100";
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const display = value && String(value).trim() ? value : "Not provided";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{display}</div>
    </div>
  );
}

export function CustomerDetailClient({
  initialCustomer,
  orders = [],
  canEdit = true,
  canDelete = true,
  embedded = false,
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
  const [activeSection, setActiveSection] = useState<"personal" | "contact" | "account" | "orders" | "notes">("personal");

  const [firstName, setFirstName] = useState(String(customer.firstName ?? ""));
  const [fatherName, setFatherName] = useState(String(customer.fatherName ?? ""));
  const [grandfatherName, setGrandfatherName] = useState(String(customer.grandfatherName ?? ""));
  const [gender, setGender] = useState(String(customer.gender ?? ""));
  const [dateOfBirth, setDateOfBirth] = useState(String(customer.dateOfBirth ?? ""));

  const [email, setEmail] = useState(String(customer.email ?? ""));
  const [phone, setPhone] = useState(String(customer.phone ?? ""));
  const [country, setCountry] = useState(String(customer.country ?? ""));
  const [city, setCity] = useState(String(customer.city ?? ""));
  const [address, setAddress] = useState(String(customer.address ?? ""));

  const [accountStatus, setAccountStatus] = useState(String(customer.accountStatus ?? "active"));
  const [customerType, setCustomerType] = useState(String(customer.customerType ?? ""));
  const [notes, setNotes] = useState(String(customer.notes ?? ""));

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fullName = useMemo(() => {
    const composed = [firstName, fatherName, grandfatherName].map((s) => s.trim()).filter(Boolean).join(" ");
    return composed || String(customer.name ?? "Customer");
  }, [customer.name, firstName, fatherName, grandfatherName]);

  const stats = useMemo(() => {
    const emailKey = String(customer.email ?? "").toLowerCase();
    const customerOrders = orders.filter((o) => String((o as any).email ?? "").toLowerCase() === emailKey);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, o) => sum + Number((o as any).total ?? 0), 0);
    return { totalOrders, totalSpent, customerOrders };
  }, [customer.email, orders]);

  const photoUrl = customer.profilePhotoUrl || customer.avatarUrl || null;

  async function refreshDetail() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}`);
      const json = await res.json();
      if (res.ok && json.data) setCustomer(json.data);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, fatherName, grandfatherName, email, phone, gender, dateOfBirth, country, city, address, accountStatus, customerType, notes }),
      });
      if (!res.ok) throw new Error("Update failed");
      dashboardSuccess("Updated", "Customer profile saved.");
      setEditMode(false);
      refreshDetail();
    } catch (e: any) { dashboardError("Error", e.message); } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (newPassword !== confirmPassword) return dashboardError("Error", "Passwords mismatch");
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${customer.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error("Reset failed");
      dashboardSuccess("Success", "Password updated.");
      setResetOpen(false);
    } catch (e: any) { dashboardError("Error", e.message); } finally { setBusy(false); }
  }

  async function toggleActive() {
    const next = accountStatus === "active" ? "inactive" : "active";
    setBusy(true);
    try {
      await fetch(`/api/backend/admin/users/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setAccountStatus(next);
      refreshDetail();
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function remove() {
    const ok = await dashboardConfirm({ title: "Delete?", text: "Permanent.", confirmButtonText: "Yes, Delete", tone: "danger" });
    if (ok) {
       setBusy(true);
       try {
         await fetch(`/api/backend/admin/users/${customer.id}`, { method: "DELETE" });
         router.push("/admin/customers");
       } catch { /* ignore */ } finally { setBusy(false); }
    }
  }

  return (
    <>
    <AdminDetailLayout
      embedded={embedded}
      topHeader={
        <AdminDetailHeader
          icon={User2}
          iconTheme="bg-primary/10 text-primary"
          category="Customers"
          title={fullName}
          subtitle={`${email || "No Email"} • ${phone || "No Phone"}`}
          onRefresh={refreshDetail}
          onBack={() => router.back()}
        />
      }
      profileCard={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
             <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-2xl shadow-sm overflow-hidden">
               {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials(fullName, email)}
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{fullName}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase", badgeTone("type", customerType))}>{customerType || "CUSTOMER"}</span>
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase", badgeTone("account", accountStatus))}>{accountStatus}</span>
                </div>
             </div>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 px-8 shadow-inner w-full md:w-auto">
              <div className="flex items-center gap-8">
                 <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Orders</span><span className="text-xl font-black text-slate-900">{stats.totalOrders}</span></div>
                 <div className="h-8 w-px bg-slate-200" />
                 <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Spent</span><span className="text-xl font-black text-slate-900">${stats.totalSpent.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!editMode ? (
                <button onClick={() => setEditMode(true)} disabled={!canEdit} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"><Pencil className="h-4 w-4" /> Edit Profile</button>
              ) : (
                <>
                  <button onClick={() => save()} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-all active:scale-95"><ShieldCheck className="h-4 w-4" /> Save</button>
                  <button onClick={() => setEditMode(false)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50">Discard</button>
                </>
              )}
              <div className="h-8 w-px bg-slate-200 mx-1" />
              <button onClick={() => setResetOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all"><Lock className="h-4 w-4 text-slate-400" /> Password</button>
              <button onClick={() => toggleActive()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all"><Unlock className="h-4 w-4 text-slate-400" /> {accountStatus === "active" ? "Deactivate" : "Activate"}</button>
              <button onClick={() => remove()} disabled={!canDelete} className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        </div>
      }
      sections={[
        { id: "personal", label: "Identity Profile", icon: User2 },
        { id: "contact", label: "Contact Details", icon: MapPin },
        { id: "account", label: "Security & Type", icon: FileText },
        { id: "orders", label: "Order History", icon: ShoppingBag },
        { id: "notes", label: "Internal Notes", icon: NotebookPen },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as any)}
    >
          {activeSection === "personal" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><User2 className="h-4 w-4" /> Personal Profile</h2>
              {editMode ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Father's Name</label><input value={fatherName} onChange={e => setFatherName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Grandfather</label><input value={grandfatherName} onChange={e => setGrandfatherName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Gender</label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none"><option value="male">Male</option><option value="female">Female</option></select></div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full Name" value={fullName} />
                  <Field label="Gender" value={gender} />
                  <Field label="Birth Date" value={formatDate(dateOfBirth)} />
                  <Field label="Marital Status" value={customer.maritalStatus} />
                </div>
              )}
            </section>
          )}
          {activeSection === "contact" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><MapPin className="h-4 w-4" /> Reach & Locale</h2>
               {editMode ? (
                 <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Email</label><input value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                    <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Address</label><textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                 </div>
               ) : (
                 <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Email Address" value={email} />
                    <Field label="Phone Line" value={phone} />
                    <Field label="Nation" value={country} />
                    <Field label="City" value={city} />
                    <div className="md:col-span-2"><Field label="Physical Residence" value={address} /></div>
                 </div>
               )}
            </section>
          )}

          {activeSection === "orders" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShoppingBag className="h-4 w-4" /> Transactions</h2>
               <div className="overflow-hidden rounded-3xl border border-slate-100">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50"><tr><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">ID</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Total</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Date</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">
                       {stats.customerOrders.map((o: any) => (
                         <tr key={o.id} className="hover:bg-slate-50 transition-all text-xs font-bold text-slate-700">
                           <td className="px-6 py-4">#{o.id.slice(0, 8).toUpperCase()}</td>
                           <td className="px-6 py-4">${Number(o.total || 0).toFixed(2)}</td>
                           <td className="px-6 py-4">{formatDate(o.createdAt)}</td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
               </div>
            </section>
          )}

          {activeSection === "notes" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><NotebookPen className="h-4 w-4" /> Admin Notes</h2>
               {editMode ? (
                 <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} className="w-full rounded-3xl border border-slate-100 bg-slate-50/50 p-6 font-bold text-slate-800 outline-none" placeholder="Administrative notes..." />
               ) : (
                 <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-8 text-sm font-bold text-slate-500 italic leading-relaxed">{notes || "No internal notes recorded."}</div>
               )}
            </section>
          )}
    </AdminDetailLayout>

      {/* @ts-ignore */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        {/* @ts-ignore */}
        <DialogContent className="rounded-[2.5rem] p-8 max-w-sm">
           {/* @ts-ignore */}
           <DialogHeader className="mb-6"><DialogTitle className="text-xl font-black uppercase">Password Reset</DialogTitle></DialogHeader>
           <div className="space-y-4">
              <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 p-4 font-bold" />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 p-4 font-bold" />
              <button disabled={busy} onClick={() => resetPassword()} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Confirm Reset</button>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
