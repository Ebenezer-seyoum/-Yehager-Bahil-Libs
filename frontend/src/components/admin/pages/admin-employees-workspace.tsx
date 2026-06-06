"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminUsersDirectory } from "@/components/admin-users-directory";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUNTRY_CALLING_CODES } from "@/lib/country-calling-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type Role = { id: string; name: string };

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

export function AdminEmployeesWorkspace({
  data,
  roles = [],
  canCreate = true,
  canEdit = false,
  canDelete = false,
  canAssignRole = false,
}: {
  data: AdminWorkspaceData;
  roles?: Role[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignRole?: boolean;
}) {
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
  const [maritalStatus, setMaritalStatus] = useState("");

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

  const [employmentType, setEmploymentType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [accountStatus, setAccountStatus] = useState<"active" | "invited" | "pending">("active");
  const [sendInviteLink, setSendInviteLink] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function resetForm() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFirstName("");
    setFatherName("");
    setGrandfatherName("");
    setGender("");
    setDateOfBirth("");
    setMaritalStatus("");
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
    setEmploymentType("");
    setStartDate("");
    setAccountStatus("active");
    setSendInviteLink(false);
    setTempPassword("");
    setShowTempPassword(false);
    setConfirmPassword("");
    setShowConfirmPassword(false);
    setRoleId("");
    setNotes("");
    setFieldErrors({});
  }

  const fullName = useMemo(() => {
    const parts = [firstName.trim(), fatherName.trim(), grandfatherName.trim()].filter(Boolean);
    return parts.join(" ");
  }, [fatherName, firstName, grandfatherName]);

  const selectedCountry = useMemo(() => {
    const iso2 = safeIso2(phoneCountryIso2);
    return COUNTRY_CALLING_CODES.find((item) => item.iso2 === iso2) ?? COUNTRY_CALLING_CODES[0];
  }, [phoneCountryIso2]);

  // Keep derived display fields stable and accessible.
  // (We keep them as state because the UI and submit payload read them.)
  useEffect(() => {
    if (!selectedCountry) return;
    setPhoneCountryName(selectedCountry.name);
    setPhoneDialCode(selectedCountry.dialCode);
  }, [selectedCountry]);

  const filteredCountryCodes = useMemo(() => {
    const q = phoneCountryQuery.trim().toLowerCase();
    if (!q) return COUNTRY_CALLING_CODES;
    return COUNTRY_CALLING_CODES.filter((item) => {
      const iso3 = (item.iso3 ?? "").toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.iso2.toLowerCase().includes(q) ||
        iso3.includes(q) ||
        item.dialCode.includes(q)
      );
    });
  }, [phoneCountryQuery]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const nameRegex = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF' -]+$/;
    const cleanFirst = firstName.trim();
    const cleanFather = fatherName.trim();
    if (!cleanFirst || !cleanFather) {
      if (!cleanFirst) errors.firstName = "First Name is required.";
      if (!cleanFather) errors.fatherName = "Father’s Name is required.";
    }
    if (!nameRegex.test(cleanFirst) || !nameRegex.test(cleanFather) || (grandfatherName.trim() && !nameRegex.test(grandfatherName.trim()))) {
      if (cleanFirst && !nameRegex.test(cleanFirst)) errors.firstName = "Please use letters only for name fields.";
      if (cleanFather && !nameRegex.test(cleanFather)) errors.fatherName = "Please use letters only for name fields.";
      if (grandfatherName.trim() && !nameRegex.test(grandfatherName.trim())) errors.grandfatherName = "Please use letters only for name fields.";
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) errors.email = "Email Address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errors.email = "Please enter a valid email address.";

    const cleanPhoneLocal = phoneNumber.trim();
    const combinedPhone = `${phoneDialCode}${cleanPhoneLocal ? ` ${cleanPhoneLocal}` : ""}`.trim();
    if (!cleanPhoneLocal) errors.phone = "Phone Number is required.";
    else if (!/^[+\d][\d\s-]{6,24}$/.test(combinedPhone)) errors.phone = "Please enter a valid phone number.";

    if (!gender.trim()) errors.gender = "Gender is required.";
    if (!accountStatus) errors.accountStatus = "Account Status is required.";

    const hasTempPassword = Boolean(tempPassword.trim());
    if (hasTempPassword) {
      if (!confirmPassword.trim()) errors.confirmPassword = "Confirm Temporary Password is required.";
      if (confirmPassword.trim() && tempPassword !== confirmPassword) errors.confirmPassword = "Password and confirm password do not match.";
      if (tempPassword.length < 8) errors.tempPassword = "Temporary Password must be at least 8 characters.";
    }

    if (photoFile) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(photoFile.type)) {
        errors.profilePhoto = "Please upload a JPG, PNG, or WEBP image within the allowed file size.";
      }
      const maxBytes = 5 * 1024 * 1024;
      if (photoFile.size > maxBytes) {
        errors.profilePhoto = "Please upload a JPG, PNG, or WEBP image within the allowed file size.";
      }
    }

    return errors;
  }

  async function uploadPhoto(file: File) {
    const signRes = await fetch("/api/backend/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "employees/avatars" }),
    });
    if (!signRes.ok) throw new Error("Could not start upload");
    const signedPayload = (await signRes.json()) as { data: any };
    const signed = signedPayload.data as {
      cloudName: string;
      apiKey: string;
      folder: string;
      publicId?: string;
      timestamp: number;
      signature: string;
    };

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);
    if (signed.publicId) form.append("public_id", signed.publicId);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!uploadRes.ok) throw new Error("Upload failed");
    const uploadJson = (await uploadRes.json()) as { secure_url?: string };
    if (!uploadJson.secure_url) throw new Error("Upload response missing URL");
    return uploadJson.secure_url;
  }

  async function submit() {
    if (!canCreate || busy) return;
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);
    setFormNotice(null);
    try {
      const avatarUrl = photoFile ? await uploadPhoto(photoFile) : undefined;
      const passwordToUse =
        tempPassword.trim() ||
        (sendInviteLink ? Array.from(crypto.getRandomValues(new Uint32Array(4))).join("").slice(0, 12) : "");
      if (!passwordToUse) {
        setFieldErrors((current) => ({ ...current, tempPassword: "Temporary Password is required unless an invite is sent." }));
        return;
      }

      const res = await fetch("/api/backend/admin/users/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: fullName || email.trim().split("@")[0],
            email: email.trim(),
            password: passwordToUse,
            roleId: roleId || undefined,
            status: accountStatus === "active" ? "active" : "inactive",
            accountStatus,
            phone: `${phoneDialCode}${phoneNumber.trim() ? ` ${phoneNumber.trim()}` : ""}`.trim(),
            avatarUrl,
            profile: {
              firstName: firstName.trim(),
              fatherName: fatherName.trim(),
            grandfatherName: grandfatherName.trim() || undefined,
            gender: gender.trim(),
            dateOfBirth: dateOfBirth || undefined,
            maritalStatus: maritalStatus.trim() || undefined,
            country: country.trim() || undefined,
            city: city.trim() || undefined,
            address: address.trim() || undefined,
            employmentType: employmentType.trim() || undefined,
            startDate: startDate || undefined,
            inviteStatus: sendInviteLink ? "pending" : "none",
            notes: notes.trim() || undefined,
          },
        }),
      });

      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const message = String(json?.message ?? "Could not create employee. Check the email is unique and try again.");
        if (res.status === 409) {
          setFormNotice({
            tone: "error",
            title: "Email Already Exists",
            message: "This email is already registered.",
          });
        } else {
          setFormNotice({ tone: "error", title: "Error", message });
        }
        return;
      }

      setFormNotice({
        tone: "success",
        title: "Employee Created Successfully",
        message: "The employee account has been created successfully.",
      });
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
      resetForm();
      setTimeout(() => setFormNotice(null), 3000);
    } catch (err) {
      setFormNotice({ tone: "error", title: "Error", message: err instanceof Error ? err.message : "Could not create employee." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminWorkspace
      pageId="employees"
      initialData={data}
      filterPlaceholder="Search employees by name, email, or role..."
      primaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!canCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Employee Account
          </button>
        </div>
      }
    >
      {({ filteredData, search, activeTab }) => (
        <>
          {activeTab === "activity" ? (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead className="bg-blue-50 text-slate-900">
                    <tr className="border-b border-blue-100">
                      <th className="px-4 py-3 text-sm font-semibold">Employee</th>
                      <th className="px-4 py-3 text-sm font-semibold">Action</th>
                      <th className="px-4 py-3 text-sm font-semibold">Module</th>
                      <th className="px-4 py-3 text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-sm font-semibold">Date / Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = search.trim().toLowerCase();
                      const rows = (filteredData.audit ?? []) as any[];
                      const filtered = q
                        ? rows.filter((row) => {
                            const blob = [
                              row.actorName,
                              row.userName,
                              row.action,
                              row.entityType,
                              row.module,
                              row.description,
                              row.ipAddress,
                            ]
                              .map((v) => String(v ?? "").toLowerCase())
                              .join(" ");
                            return blob.includes(q);
                          })
                        : rows;

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              No activity logs found.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((row: any) => (
                        <tr
                          key={String(row.id ?? `${row.createdAt}-${row.action}`)}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-4 text-sm text-slate-900">{String(row.actorName ?? row.userName ?? "—")}</td>
                          <td className="px-4 py-4 text-sm text-slate-900">{String(row.action ?? "—")}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{String(row.entityType ?? row.module ?? "—")}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{String(row.description ?? "—")}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          ) : activeTab === "performance" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Performance</h3>
              <p className="mt-1 text-sm text-slate-600">No performance data found.</p>
            </section>
          ) : (
          <AdminUsersDirectory
            users={(filteredData.users ?? []) as Parameters<typeof AdminUsersDirectory>[0]["users"]}
            query={search}
            mode={activeTab}
            canEdit={canEdit}
            canDelete={canDelete}
            canAssignRole={canAssignRole}
          />
          )}

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
            <DialogContent className="max-w-3xl">
              <div ref={scrollRef} className="max-h-[72vh] overflow-y-auto pr-1">
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
                    <h2 className="font-heading text-base font-semibold">Create Employee</h2>
                    <p className="mt-1 text-xs text-blue-100">
                      Add an employee account. If no role is selected, the employee can sign in but will see Access Pending until access is assigned.
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
                    <div className="mt-3 grid gap-4 md:grid-cols-[180px_1fr]">
                      <div className="h-[180px] w-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Employee profile preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                            {((firstName.trim()?.[0] ?? "") + (fatherName.trim()?.[0] ?? "")).toUpperCase() || "—"}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setPhotoFile(file);
                            if (!file) {
                              setPhotoPreview(null);
                              return;
                            }
                            const url = URL.createObjectURL(file);
                            setPhotoPreview(url);
                          }}
                          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-900 hover:file:bg-blue-100"
                        />
                        {fieldErrors.profilePhoto ? <p className="text-xs font-medium text-rose-700">{fieldErrors.profilePhoto}</p> : null}
                        {photoFile ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            }}
                            className="text-sm font-semibold text-slate-700 underline hover:text-slate-900"
                          >
                            Remove photo
                          </button>
                        ) : (
                          <p className="text-xs text-slate-600">Optional. JPG/PNG/WEBP up to 5MB.</p>
                        )}
                      </div>
                    </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Personal Information
                    </summary>
                    <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">First Name *</span>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        {fieldErrors.firstName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.firstName}</p> : null}
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Father’s Name *</span>
                        <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        {fieldErrors.fatherName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.fatherName}</p> : null}
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Grandfather’s Name</span>
                        <input value={grandfatherName} onChange={(e) => setGrandfatherName(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        {fieldErrors.grandfatherName ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.grandfatherName}</p> : null}
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Gender *</span>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        {fieldErrors.gender ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.gender}</p> : null}
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Date of Birth</span>
                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Marital Status</span>
                        <input value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </label>
                    </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Contact Information
                    </summary>
                    <div className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm md:col-span-2">
                        <span className="mb-1.5 block font-medium text-slate-700">Email Address *</span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.email}</p> : null}
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Phone Number *</span>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              >
                                <span className="flex min-w-0 items-center gap-2 truncate">
                                  <span className="truncate">
                                    <span className="inline-flex items-center gap-2">
                                      <FlagImage iso2={phoneCountryIso2} name={phoneCountryName} />
                                      <span className="truncate">
                                        {(selectedCountry?.iso3 ?? selectedCountry?.iso2) || ""} {phoneDialCode}
                                      </span>
                                    </span>
                                  </span>
                                </span>
                                <span className="text-slate-400">▼</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[340px] border border-slate-200 bg-white p-2 text-slate-900 shadow-lg">
                              <input
                                value={phoneCountryQuery}
                                onChange={(e) => setPhoneCountryQuery(e.target.value)}
                                placeholder="Search country, code, or dial…"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                              <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-100">
                                {filteredCountryCodes.length === 0 ? (
                                  <div className="px-3 py-3 text-sm text-slate-600">No matches.</div>
                                ) : (
                                  filteredCountryCodes.map((item) => (
                                    <button
                                      key={`${item.iso2}-${item.dialCode}`}
                                      type="button"
                                      onClick={() => {
                                        setPhoneCountryIso2(item.iso2);
                                        setPhoneCountryName(item.name);
                                        setPhoneDialCode(item.dialCode);
                                        setPhoneCountryQuery("");
                                        setPhoneCountryOpen(false);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50",
                                        item.iso2 === safeIso2(phoneCountryIso2) ? "bg-blue-50" : "",
                                      )}
                                    >
                                      <span className="flex min-w-0 items-center gap-2 truncate text-slate-900">
                                        <FlagImage iso2={item.iso2} name={item.name} />
                                        <span className="min-w-0 truncate">
                                          {item.name} <span className="text-slate-600">({item.iso2})</span>
                                        </span>
                                      </span>
                                      <span className="shrink-0 font-semibold text-slate-900">{item.dialCode}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <input
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Phone number"
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        {fieldErrors.phone ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.phone}</p> : null}
                      </label>
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Employment Type</span>
                        <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                          <option value="">—</option>
                          <option value="full_time">Full-time</option>
                          <option value="part_time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="temporary">Temporary</option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Start Date</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Account Status *</span>
                        <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as any)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                          <option value="active">Active</option>
                          <option value="invited">Invited</option>
                          <option value="pending">Inactive</option>
                        </select>
                        {fieldErrors.accountStatus ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.accountStatus}</p> : null}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={sendInviteLink} onChange={(e) => setSendInviteLink(e.target.checked)} />
                        <span className="font-medium text-slate-700">Send Invite Link</span>
                      </label>
                      <label className="block text-sm md:col-span-2">
                        <span className="mb-1.5 block font-medium text-slate-700">Temporary Password</span>
                        <div className="relative">
                          <input
                            type={showTempPassword ? "text" : "password"}
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTempPassword((current) => !current)}
                            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                            aria-label={showTempPassword ? "Hide temporary password" : "Show temporary password"}
                          >
                            {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {fieldErrors.tempPassword ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.tempPassword}</p> : null}
                      </label>
                      <label className={cn("block text-sm md:col-span-2", tempPassword.trim() ? "" : "opacity-60")}>
                        <span className="mb-1.5 block font-medium text-slate-700">Confirm Temporary Password</span>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        {fieldErrors.confirmPassword ? <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.confirmPassword}</p> : null}
                      </label>
                    </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Role Status / Permission Note
                    </summary>
                    <div className="p-4">
                    <div className="space-y-3">
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Role (optional)</span>
                        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                          <option value="">No role (Access Pending)</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
                        Role is optional during employee creation. If no role is selected, the employee can sign in but will see an Access Pending screen until an administrator assigns access.
                      </div>
                    </div>
                    </div>
                  </details>

                  <details open className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 ring-1 ring-inset ring-blue-100">
                      Notes
                    </summary>
                    <div className="p-4">
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
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
                  disabled={!canCreate || busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busy ? "Creating…" : "Create Employee"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AdminWorkspace>
  );
}
