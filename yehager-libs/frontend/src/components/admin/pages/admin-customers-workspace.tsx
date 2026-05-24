"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminCustomersDirectory } from "@/components/admin-customers-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRY_CALLING_CODES } from "@/lib/country-calling-codes";
import { cn } from "@/lib/utils";
import { dashboardError } from "@/lib/dashboard-swal";
import type { AdminWorkspaceData } from "@/lib/admin/types";

function safeIso2(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "ZZ";
}

const getFlagUrl = (iso2?: string | null) => {
  if (!iso2) return "";
  const code = iso2.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return "";
  return `https://flagcdn.com/w40/${code}.png`;
};

function FlagImage({
  iso2,
  name,
  className,
}: {
  iso2?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = getFlagUrl(iso2);
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex h-4 w-6 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600",
          className,
        )}
      >
        —
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`${name ?? iso2 ?? "Country"} flag`}
      className={cn("h-4 w-6 rounded-sm object-cover shadow-sm", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function AdminCustomersWorkspace({ data }: { data: AdminWorkspaceData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [grandfatherName, setGrandfatherName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [email, setEmail] = useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState("ET");
  const [phoneCountryName, setPhoneCountryName] = useState("Ethiopia");
  const [phoneDialCode, setPhoneDialCode] = useState("+251");
  const [phoneCountryQuery, setPhoneCountryQuery] = useState("");
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [accountStatus, setAccountStatus] = useState<"active" | "invited" | "inactive" | "blocked">("active");
  const [sendInviteLink, setSendInviteLink] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [confirmTempPassword, setConfirmTempPassword] = useState("");

  const [customerType, setCustomerType] = useState("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function resetForm() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFirstName("");
    setFatherName("");
    setGrandfatherName("");
    setGender("");
    setDateOfBirth("");
    setEmail("");
    setPhoneCountryIso2("ET");
    setPhoneCountryName("Ethiopia");
    setPhoneDialCode("+251");
    setPhoneCountryQuery("");
    setPhoneCountryOpen(false);
    setPhoneNumber("");
    setCountry("");
    setCity("");
    setAddress("");
    setAccountStatus("active");
    setSendInviteLink(false);
    setTempPassword("");
    setConfirmTempPassword("");
    setCustomerType("");
    setNotes("");
    setFieldErrors({});
    setFormNotice(null);
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

  function validateImage(file: File | null) {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) return "Only jpg, jpeg, png, webp allowed.";
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) return "File size must not exceed limit.";
    return null;
  }

  const fullName = useMemo(() => {
    return [firstName, fatherName, grandfatherName].map((s) => s.trim()).filter(Boolean).join(" ");
  }, [firstName, fatherName, grandfatherName]);

  async function submit() {
    const nextErrors: Record<string, string> = {};
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = `${phoneDialCode} ${phoneNumber}`.trim();

    if (!trimmedFirstName) nextErrors.firstName = "First Name is required.";
    if (trimmedFirstName && !validateName(trimmedFirstName)) nextErrors.firstName = "Please use letters only for name fields.";
    if (fatherName.trim() && !validateName(fatherName)) nextErrors.fatherName = "Please use letters only for name fields.";
    if (grandfatherName.trim() && !validateName(grandfatherName)) nextErrors.grandfatherName = "Please use letters only for name fields.";

    if (!trimmedEmail) nextErrors.email = "Email Address is required.";
    if (trimmedEmail && !validateEmail(trimmedEmail)) nextErrors.email = "Please enter a valid email address.";

    if (!phoneNumber.trim()) nextErrors.phone = "Phone Number is required.";
    if (trimmedPhone && !validatePhone(trimmedPhone)) nextErrors.phone = "Please enter a valid phone number.";

    if (!accountStatus) nextErrors.accountStatus = "Account Status is required.";

    if (tempPassword.trim()) {
      if (!confirmTempPassword.trim()) nextErrors.confirmTempPassword = "Confirm Temporary Password is required if Temporary Password is used.";
      if (confirmTempPassword.trim() && tempPassword !== confirmTempPassword) {
        nextErrors.confirmTempPassword = "Password and confirm password do not match.";
      }
    }

    const imgError = validateImage(photoFile);
    if (imgError) nextErrors.profilePhoto = imgError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormNotice({ tone: "error", title: "Validation Error", message: Object.values(nextErrors)[0] });
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);
    setFormNotice(null);
    try {
      const res = await fetch("/api/backend/admin/users/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          fatherName: fatherName.trim() || null,
          grandfatherName: grandfatherName.trim() || null,
          name: fullName || trimmedFirstName,
          email: trimmedEmail,
          phone: trimmedPhone,
          gender: gender.trim() || null,
          dateOfBirth: dateOfBirth || null,
          country: country.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          accountStatus,
          invite: sendInviteLink,
          tempPassword: tempPassword || null,
          customerType: customerType.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        const message = String(json?.message ?? "Unable to create customer. Please try again.");
        if (res.status === 409 || (message.toLowerCase().includes("email") && message.toLowerCase().includes("exist"))) {
          setFormNotice({ tone: "error", title: "Email Already Exists", message: "This email is already registered." });
        } else {
          setFormNotice({ tone: "error", title: "Error", message });
        }
        return;
      }

      setFormNotice({
        tone: "success",
        title: "Customer Created Successfully",
        message: "The customer account has been created successfully.",
      });
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      resetForm();
      router.refresh();
      setTimeout(() => setFormNotice(null), 3000);
    } catch (e) {
      setFormNotice({
        tone: "error",
        title: "Error",
        message: e instanceof Error ? e.message : "Unable to create customer. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminWorkspace
      pageId="customers"
      initialData={data}
      showDateRange
      filterPlaceholder="Search customers by name or email..."
      primaryAction={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950"
        >
          <Plus className="h-4 w-4" /> Create Customer Account
        </button>
      }
    >
      {({ activeTab, filteredData, search }) => (
        <>
          <AdminCustomersDirectory
            tab={activeTab}
            data={filteredData}
            query={search}
          />

          <Dialog
            open={open}
            onOpenChange={(next) => {
              if (!next) {
                resetForm();
                setFormNotice(null);
              }
              setOpen(next);
            }}
          >
            <DialogContent className="max-w-4xl">
              <div ref={scrollRef} className="max-h-[78vh] overflow-y-auto pr-1">
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 px-5 py-4 text-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/20"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h2 className="font-heading text-base font-semibold">Create Customer</h2>
                    <p className="mt-1 text-xs text-blue-100">
                      Add a customer account with profile, contact details, and account status.
                    </p>
                  </div>

                  {formNotice ? (
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm",
                        formNotice.tone === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-rose-200 bg-rose-50 text-rose-900",
                      )}
                    >
                      <p className="font-bold">{formNotice.title}</p>
                      <p className="mt-0.5 text-sm">{formNotice.message}</p>
                    </div>
                  ) : null}

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Profile Picture
                    </summary>
                    <div className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">4:4</div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm"
                          />
                          {fieldErrors.profilePhoto ? <p className="text-xs font-medium text-rose-700">{fieldErrors.profilePhoto}</p> : null}
                          <p className="text-xs text-slate-600">Optional. JPG, PNG, or WebP up to 3MB.</p>
                        </div>
                      </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Personal Information
                    </summary>
                    <div className="p-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">First Name <span className="text-rose-600">*</span></span>
                          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          {fieldErrors.firstName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.firstName}</p> : null}
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Father’s Name</span>
                          <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          {fieldErrors.fatherName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.fatherName}</p> : null}
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Grandfather’s Name</span>
                          <input value={grandfatherName} onChange={(e) => setGrandfatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          {fieldErrors.grandfatherName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.grandfatherName}</p> : null}
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
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Contact Information
                    </summary>
                    <div className="p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Email Address <span className="text-rose-600">*</span></span>
                          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.email}</p> : null}
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Phone Number <span className="text-rose-600">*</span></span>
                          <div className="flex h-11 w-full overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
                            <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-full items-center gap-2 border-r border-slate-200 px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                                >
                                  <FlagImage iso2={phoneCountryIso2} name={phoneCountryName} />
                                  <span className="text-slate-700">{phoneDialCode}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                <div className="border-b border-slate-200 bg-white p-3">
                                  <input
                                    value={phoneCountryQuery}
                                    onChange={(e) => setPhoneCountryQuery(e.target.value)}
                                    placeholder="Search country…"
                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                  />
                                </div>
                                <div className="max-h-64 overflow-y-auto bg-white p-1">
                                  {COUNTRY_CALLING_CODES.filter((row) => {
                                    const q = phoneCountryQuery.trim().toLowerCase();
                                    if (!q) return true;
                                    return (
                                      String(row.name).toLowerCase().includes(q) ||
                                      String(row.dialCode).toLowerCase().includes(q) ||
                                      String(row.iso2).toLowerCase().includes(q)
                                    );
                                  }).map((row) => (
                                    <button
                                      key={`${row.iso2}-${row.dialCode}`}
                                      type="button"
                                      onClick={() => {
                                        setPhoneCountryIso2(safeIso2(String(row.iso2)));
                                        setPhoneCountryName(String(row.name));
                                        setPhoneDialCode(String(row.dialCode));
                                        setPhoneCountryOpen(false);
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-blue-50"
                                    >
                                      <FlagImage iso2={row.iso2} name={row.name} />
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold text-slate-900">{row.name}</div>
                                        <div className="text-xs text-slate-600">{row.dialCode}</div>
                                      </div>
                                      <div className="text-xs font-semibold text-slate-500">{String(row.iso2).toUpperCase()}</div>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <input
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="9xx xxx xxx"
                              className="h-full w-full border-0 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                            />
                          </div>
                          {fieldErrors.phone ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.phone}</p> : null}
                        </label>
                      </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Address Information
                    </summary>
                    <div className="p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Country</span>
                          <input value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">City</span>
                          <input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </label>
                        <label className="block text-sm md:col-span-2">
                          <span className="mb-1.5 block font-medium text-slate-700">Address</span>
                          <input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </label>
                      </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Account Information
                    </summary>
                    <div className="p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Account Status <span className="text-rose-600">*</span></span>
                          <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as any)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                            <option value="active">Active</option>
                            <option value="invited">Invited</option>
                            <option value="inactive">Inactive</option>
                            <option value="blocked">Blocked</option>
                          </select>
                          {fieldErrors.accountStatus ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.accountStatus}</p> : null}
                        </label>
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
                          <input type="checkbox" checked={sendInviteLink} onChange={(e) => setSendInviteLink(e.target.checked)} />
                          Send Invite Link
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Temporary Password</span>
                          <input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block font-medium text-slate-700">Confirm Temporary Password {tempPassword.trim() ? <span className="text-rose-600">*</span> : null}</span>
                          <input type="password" value={confirmTempPassword} onChange={(e) => setConfirmTempPassword(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                          {fieldErrors.confirmTempPassword ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.confirmTempPassword}</p> : null}
                        </label>
                      </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Customer Type / Notes
                    </summary>
                    <div className="p-4">
                      <div className="grid gap-3 md:grid-cols-2">
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
                        <label className="block text-sm md:col-span-2">
                          <span className="mb-1.5 block font-medium text-slate-700">Internal Notes</span>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </label>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setOpen(false); resetForm(); }}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50",
                  )}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Creating…" : "Create Customer"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AdminWorkspace>
  );
}
