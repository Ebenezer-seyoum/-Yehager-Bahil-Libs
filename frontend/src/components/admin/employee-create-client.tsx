"use client";

import { useMemo, useRef, useState, useEffect, type ComponentType, type PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Globe,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountStatus, Role } from "@/lib/admin/types";
import { COUNTRY_CALLING_CODES } from "@/lib/country-calling-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { safeIso2 } from "@/lib/utils/phone-utils";
import { filterAssignableEmployeeRoles } from "@/lib/admin/assignable-roles";

const TypedPopoverContent = PopoverContent as ComponentType<PropsWithChildren<{ align?: string; className?: string; sideOffset?: number }>>;

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

export function EmployeeCreateClient({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // State for form
  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandfatherName, setGrandfatherName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState("ET");
  const [phoneDialCode, setPhoneDialCode] = useState("+251");
  const [phoneCountryQuery, setPhoneCountryQuery] = useState("");
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("Ethiopia");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [sendInviteLink, setSendInviteLink] = useState(true);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const assignableRoles = useMemo(() => filterAssignableEmployeeRoles(roles), [roles]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);

  useEffect(() => {
    if (!formNotice) return;
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
    noticeTimeoutRef.current = setTimeout(() => {
      setFormNotice(null);
      noticeTimeoutRef.current = null;
    }, 10000);
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
    };
  }, [formNotice]);

  function generateAutoPassword() {
    // Keep this compatible with backend policy: min 8, include mixed chars.
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%^&*";
    const all = upper + lower + digits + symbols;
    const seed = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    while (seed.length < 12) {
      seed.push(all[Math.floor(Math.random() * all.length)]);
    }
    return seed.sort(() => Math.random() - 0.5).join("");
  }

  const selectedCountry = useMemo(() => {
    return COUNTRY_CALLING_CODES.find((item) => item.iso2 === safeIso2(phoneCountryIso2)) ?? COUNTRY_CALLING_CODES[0];
  }, [phoneCountryIso2]);

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
    if (!fatherName.trim()) errors.fatherName = "Father's name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Valid email is required";
    if (!phoneNumber.trim()) errors.phone = "Phone number is required";
    if (!gender) errors.gender = "Gender is required";
    if (!sendInviteLink && (!tempPassword || tempPassword.length < 8)) errors.tempPassword = "Password must be at least 8 characters";
    if (!sendInviteLink && tempPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  const handleCreate = async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0] ?? "Please complete all required fields.";
      setFormNotice({
        tone: "error",
        title: "Validation Error",
        message: firstError,
      });
      return;
    }

    setBusy(true);
    setFormNotice(null);

    try {
      // Mock photo upload logic or actual implementation
      let avatarUrl = undefined;
      if (photoFile) {
        // Implement upload logic or just use preview for now if backend expects URL
      }

      const passwordToSend = sendInviteLink ? generateAutoPassword() : tempPassword;

      const payload = {
        name: `${firstName} ${fatherName} ${grandfatherName}`.trim(),
        email: email.trim(),
        phone: `${phoneDialCode}${phoneNumber.trim()}`,
        roleId: roleId || undefined,
        status: accountStatus,
        avatarUrl,
        password: passwordToSend,
        sendInvite: sendInviteLink,
        profile: {
          firstName: firstName.trim(),
          fatherName: fatherName.trim(),
          grandfatherName: grandfatherName.trim() || undefined,
          gender,
          dateOfBirth: dateOfBirth || undefined,
          maritalStatus: maritalStatus || undefined,
          country,
          city,
          address,
          employmentType,
          startDate,
          notes
        }
      };

      const res = await fetch("/api/backend/admin/users/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create employee");
      }

      setFormNotice({ tone: "success", title: "Success", message: "Employee account created successfully" });
      setTimeout(() => router.push("/admin/users"), 1500);
    } catch (error: any) {
      setFormNotice({ tone: "error", title: "Error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-20">
      {/* Premium Header */}
      <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl ring-1 ring-black/[0.02] border-l-4 border-l-primary">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 min-w-0 gap-6 items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <User className="h-10 w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-1">
                Management / Employees
              </p>
              <h1 className="truncate font-black text-4xl tracking-tight text-slate-900 uppercase">
                Add New Staff
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
                Register a new employee account and configure their access permissions.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 items-end">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.refresh()}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 group"
              >
                <RefreshCw className="h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                Refresh
              </button>
              <button
                onClick={() => router.back()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Directory
              </button>
            </div>
          </div>
        </div>
      </header>

      {formNotice ? (
        <div
          className={cn(
            "fixed right-4 top-4 z-[120] flex w-[min(92vw,420px)] items-start gap-3 rounded-2xl p-4 shadow-2xl ring-1 animate-in fade-in slide-in-from-top-2 duration-300",
            formNotice.tone === "success"
              ? "bg-emerald-900 text-emerald-50 ring-emerald-700"
              : "bg-rose-900 text-rose-50 ring-rose-700",
          )}
          role="status"
          aria-live="polite"
        >
          {formNotice.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 text-rose-200" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-wide">{formNotice.title}</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed">{formNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormNotice(null)}
            className="rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      ) : null}

      {/* Main Form Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar: Profile & Status */}
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
              <User className="h-4 w-4" />
              Profile Avatar
            </h3>
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="h-48 w-48 overflow-hidden rounded-[2.5rem] border-4 border-slate-50 bg-slate-100 shadow-inner group-hover:border-primary/10 transition-colors">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50">
                      <User className="h-20 w-20 text-slate-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest">Change Photo</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                JPG, PNG or WEBP (Max 5MB)
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              System Access
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-tight text-slate-900">Personnel Role</label>
                <select 
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">No Role Assigned</option>
                  {assignableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-tight text-slate-900">Current Status</label>
                <select 
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="active">Active Entry</option>
                  <option value="pending">Blocked / Inactive</option>
                  <option value="invited">Invitation Pending</option>
                </select>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Content: Info Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-8 py-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <FileText className="h-4 w-4" />
                Employee Credentials & Info
              </h3>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Name Details */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all",
                      fieldErrors.firstName ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20"
                    )}
                    placeholder="E.g. Ebenezer"
                  />
                  {fieldErrors.firstName && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                    Father's Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all",
                      fieldErrors.fatherName ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20"
                    )}
                    placeholder="E.g. Seyoum"
                  />
                  {fieldErrors.fatherName && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.fatherName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900">Grandfather's Name</label>
                  <input 
                    value={grandfatherName}
                    onChange={(e) => setGrandfatherName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 placeholder:text-slate-300"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Contact Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all",
                      fieldErrors.email ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20"
                    )}
                    placeholder="staff@yehagerbahil.com"
                  />
                  {fieldErrors.email && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all hover:bg-slate-100 min-w-[90px]">
                          <FlagImage iso2={phoneCountryIso2} />
                          <span className="text-xs font-black">{phoneDialCode}</span>
                        </button>
                      </PopoverTrigger>
                      <TypedPopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-2xl border-slate-100">
                        <div className="p-2 border-b border-slate-50">
                          <input 
                            className="w-full bg-slate-50 border-none rounded-lg text-xs font-bold p-2 focus:ring-0" 
                            placeholder="Search code..."
                            value={phoneCountryQuery}
                            onChange={e => setPhoneCountryQuery(e.target.value)}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1">
                          {filteredCountryCodes.map(c => (
                            <button 
                              key={c.iso2 + c.dialCode}
                              onClick={() => {
                                setPhoneCountryIso2(c.iso2);
                                setPhoneDialCode(c.dialCode);
                                setPhoneCountryOpen(false);
                              }}
                              className="flex w-full items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl text-left"
                            >
                              <FlagImage iso2={c.iso2} />
                              <span className="text-[10px] font-black uppercase flex-1">{c.name}</span>
                              <span className="text-[10px] font-bold text-slate-400">{c.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      </TypedPopoverContent>
                    </Popover>
                    <input 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all flex-1",
                        fieldErrors.phone ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20"
                      )}
                      placeholder="900 000 000"
                    />
                  </div>
                  {fieldErrors.phone && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.phone}</p>}
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5">Gender <span className="text-rose-500">*</span></label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {fieldErrors.gender && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.gender}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Date of Birth</label>
                  <input 
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900">Employment Type</label>
                  <select 
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Country</label>
                  <input 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> City</label>
                  <input 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-tight text-slate-900">Address Line</label>
                  <input 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Logic */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900">Authentication Method</p>
                    <p className="text-xs font-medium text-slate-500">Choose how the employee will set their password.</p>
                  </div>
                  <button 
                    onClick={() => setSendInviteLink(!sendInviteLink)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      sendInviteLink ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      sendInviteLink ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {sendInviteLink ? (
                  <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-xs font-bold uppercase tracking-tight leading-none pt-0.5">
                      System will send an encrypted invitation link to the email above.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5"><Lock className="h-3 w-3" /> Temporary Password</label>
                      <div className="relative">
                        <input 
                          type={showTempPassword ? "text" : "password"}
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          className={cn(
                            "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all pr-12",
                            fieldErrors.tempPassword ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                        <button onClick={() => setShowTempPassword(!showTempPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                          {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.tempPassword && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.tempPassword}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-1.5"><Lock className="h-3 w-3" /> Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn(
                            "w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all pr-12",
                            fieldErrors.confirmPassword ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/20"
                          )}
                        />
                        <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">{fieldErrors.confirmPassword}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => router.back()}
                  className="px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Discard
                </button>
                <button 
                  type="button"
                  onClick={handleCreate}
                  disabled={busy}
                  className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl bg-[#166534] px-10 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-[#166534]/25 transition-all hover:scale-[1.02] hover:bg-[#14532D] active:scale-100 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {busy ? "Adding..." : "Add Employee"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
