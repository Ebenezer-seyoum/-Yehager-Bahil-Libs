"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  NotebookPen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_CALLING_CODES } from "@/lib/country-calling-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { safeIso2 } from "@/lib/utils/phone-utils";

function FlagImage({ iso2, name, className }: { iso2?: string | null; name?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = iso2 ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : "";
  if (!src || failed) {
    return (
      <span className={cn("flex h-4 w-6 items-center justify-center rounded-sm border bg-slate-50 text-[10px] font-bold text-slate-400", className)}>
        —
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name ?? "Flag"}
      className={cn("h-4 w-6 rounded-sm object-cover shadow-sm", className)}
      onError={() => setFailed(true)}
    />
  );
}

export function CustomerCreateClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  
  // State for form
  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandfatherName, setGrandfatherName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState("ET");
  const [phoneDialCode, setPhoneDialCode] = useState("+251");
  const [phoneCountryQuery, setPhoneCountryQuery] = useState("");
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [accountStatus, setAccountStatus] = useState("active");
  const [customerType, setCustomerType] = useState("new");
  const [sendInviteLink, setSendInviteLink] = useState(true);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);

  const filteredCountryCodes = useMemo(() => {
    const q = phoneCountryQuery.trim().toLowerCase();
    if (!q) return COUNTRY_CALLING_CODES;
    return COUNTRY_CALLING_CODES.filter((item) => 
      item.name.toLowerCase().includes(q) || 
      item.iso2.toLowerCase().includes(q) || 
      item.dialCode.includes(q)
    );
  }, [phoneCountryQuery]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Valid email is required";
    if (!phoneNumber.trim()) errors.phone = "Phone number is required";
    if (!sendInviteLink && (!tempPassword || tempPassword.length < 8)) errors.tempPassword = "Password must be at least 8 characters";
    if (!sendInviteLink && tempPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  const handleCreate = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setFormNotice(null);

    try {
      const payload = {
        firstName: firstName.trim(),
        fatherName: fatherName.trim() || null,
        grandfatherName: grandfatherName.trim() || null,
        name: `${firstName} ${fatherName} ${grandfatherName}`.trim(),
        email: email.trim(),
        phone: `${phoneDialCode}${phoneNumber.trim()}`,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        country,
        city,
        address,
        accountStatus,
        customerType,
        invite: sendInviteLink,
        tempPassword: sendInviteLink ? null : tempPassword,
        notes
      };

      const res = await fetch("/api/backend/admin/users/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create customer");
      }

      setFormNotice({ tone: "success", title: "Success", message: "Customer account created successfully" });
      setTimeout(() => router.push("/admin/customers"), 1500);
    } catch (error: any) {
      setFormNotice({ tone: "error", title: "Error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-20">
      <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl border-l-4 border-l-primary">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm overflow-hidden font-black text-2xl">
              <User className="h-10 w-10" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-1">Management / Customers</p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight text-nowrap">Register Customer</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Create a new customer profile and account details.</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex items-center gap-2">
                <button onClick={() => router.refresh()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 group transition-all">
                  <RefreshCw className="h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" /> Refresh
                </button>
                <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
             </div>
          </div>
        </div>
      </header>

      {formNotice && (
        <div className={cn(
          "flex items-center gap-4 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-white animate-in fade-in slide-in-from-top-4 duration-300",
          formNotice.tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {formNotice.tone === "success" ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          <div>
            <p className="font-black uppercase tracking-tight text-xl">{formNotice.title}</p>
            <p className="font-bold opacity-90">{formNotice.message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4 space-y-6">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="h-4 w-4" /> Account Setup</h3>
             <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Class</label>
                  <select value={customerType} onChange={e => setCustomerType(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none">
                    <option value="new">New Customer</option>
                    <option value="returning">Returning</option>
                    <option value="vip">VIP Member</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Status</label>
                  <select value={accountStatus} onChange={e => setAccountStatus(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none">
                    <option value="active">Active Account</option>
                    <option value="inactive">Inactive</option>
                    <option value="invited">Invitation Only</option>
                  </select>
                </div>
             </div>
           </section>
        </aside>

        <main className="lg:col-span-8 space-y-6">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><User className="h-4 w-4" /> Identity Details</h3>
             </div>
             <div className="p-8 space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">First Name <span className="text-rose-500">*</span></label><input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Father's Name</label><input value={fatherName} onChange={e => setFatherName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Grandfather</label><input value={grandfatherName} onChange={e => setGrandfatherName(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Gender</label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none"><option value="">Select...</option><option value="male">Male</option><option value="female">Female</option></select></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Birth Date</label><input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                </div>
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><MapPin className="h-4 w-4" /> Reach & Address</h3>
             </div>
             <div className="p-8 space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Email Address <span className="text-rose-500">*</span></label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Phone Line <span className="text-rose-500">*</span></label>
                      <div className="flex gap-2">
                        <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                          <PopoverTrigger asChild>
                            <button className="flex h-14 items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 font-bold hover:bg-slate-50">
                              <FlagImage iso2={phoneCountryIso2} /> <span className="text-xs">{phoneDialCode}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64 rounded-[2rem] p-4 shadow-2xl border-slate-100">
                             <input value={phoneCountryQuery} onChange={e => setPhoneCountryQuery(e.target.value)} className="w-full rounded-xl bg-slate-50 p-2 text-xs font-bold outline-none" placeholder="Search..." />
                             <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                                {filteredCountryCodes.map(c => (
                                  <button key={c.iso2 + c.dialCode} onClick={() => { setPhoneCountryIso2(c.iso2); setPhoneDialCode(c.dialCode); setPhoneCountryOpen(false); }} className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-slate-50 text-left">
                                     <FlagImage iso2={c.iso2} /> <span className="text-[10px] font-black uppercase flex-1">{c.name}</span>
                                  </button>
                                ))}
                             </div>
                          </PopoverContent>
                        </Popover>
                        <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" />
                      </div>
                   </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Nation</label><input value={country} onChange={e => setCountry(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">City</label><input value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                   <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Physical Address</label><input value={address} onChange={e => setAddress(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                </div>
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Lock className="h-4 w-4" /> Password & Privacy</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="space-y-1"><p className="text-sm font-black uppercase text-slate-900 tracking-tight">Email Invitation</p><p className="text-xs font-bold text-slate-400">Send an encrypted link for the customer to set their own password.</p></div>
                   <button onClick={() => setSendInviteLink(!sendInviteLink)} className={cn("relative inline-flex h-6 w-11 rounded-full p-1 transition-all", sendInviteLink ? "bg-primary" : "bg-slate-200")}><span className={cn("h-4 w-4 rounded-full bg-white transition-all", sendInviteLink ? "translate-x-5" : "translate-x-0")} /></button>
                </div>
                {!sendInviteLink && (
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-2">
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Temporary Password</label><input type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                     <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" /></div>
                  </div>
                )}
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><NotebookPen className="h-4 w-4" /> Internal Notes</h3>
             </div>
             <div className="p-8">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 font-bold outline-none" placeholder="..." />
             </div>
           </section>

           <div className="flex items-center justify-end gap-4 pt-4">
              <button onClick={() => router.back()} className="px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
              <button onClick={handleCreate} disabled={busy} className="inline-flex h-16 items-center gap-3 rounded-3xl bg-slate-900 px-12 text-sm font-black uppercase tracking-widest text-white shadow-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
                {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />} {busy ? "Registering..." : "Create Account"}
              </button>
           </div>
        </main>
      </div>
    </div>
  );
}
