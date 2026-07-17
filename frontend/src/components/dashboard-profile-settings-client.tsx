"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { uploadFileToS3 } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import { DashboardAppearanceSettings } from "@/components/dashboard-appearance-settings";

export type EmployeeProfile = {
  firstName?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  maritalStatus?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  inviteStatus?: string | null;
  notes?: string | null;
};

export type DashboardProfile = {
  name?: string | null;
  email?: string | null;
  role?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountStatus?: string | null;
  roleStatus?: "unassigned" | "assigned";
  assignedRoleName?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  profile?: EmployeeProfile | null;
};

type SectionId = "personal" | "contact" | "employment" | "access" | "password";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

async function uploadAvatar(file: File) {
  return uploadFileToS3(file, "employees/avatars");
}

function value(v: unknown, fallback = "Not provided") {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function titleCase(v: unknown) {
  return value(v)
    .split(/[._-]/g)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
}

function dateInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function dateDisplay(v?: string | null) {
  if (!v) return "Not provided";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "Not provided" : d.toLocaleDateString();
}

function initials(name?: string | null, email?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    email?.slice(0, 2).toUpperCase() ||
    "U"
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Detail({
  label,
  value: detailValue,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{detailValue}</p>
    </div>
  );
}

export function DashboardProfileSettingsClient({
  initialProfile,
  sessionUser,
  variant,
}: {
  initialProfile: DashboardProfile | null;
  sessionUser: {
    name?: string | null;
    email?: string | null;
    assignedRoleName?: string | null;
    role?: string | null;
  } | null;
  variant: "admin" | "employee";
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const employeeProfile = profile?.profile ?? {};
  const isAdminProfile = variant === "admin";
  const assignedRole = isAdminProfile
    ? "Administrator"
    : (profile?.assignedRoleName ??
      sessionUser?.assignedRoleName ??
      (profile?.roleStatus === "unassigned"
        ? "Access pending"
        : "Assigned employee"));
  const profileFullName = [
    employeeProfile.firstName,
    employeeProfile.fatherName,
    employeeProfile.grandfatherName,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const displayName = value(
    profileFullName || profile?.name || sessionUser?.name,
    "Account",
  );
  const displayFirstFather = [
    employeeProfile.firstName,
    employeeProfile.fatherName,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const avatarUrl = profile?.avatarUrl;
  const effectiveAvatarUrl =
    uploadedAvatarUrl ?? avatarPreviewUrl ?? avatarUrl ?? null;
  const editableSection =
    activeSection === "personal" || activeSection === "contact";
  const activeFormId = editableSection
    ? `profile-${activeSection}-form`
    : undefined;

  const sections = useMemo(() => {
    const base = [
      { id: "personal" as const, label: "Personal", icon: UserRound },
      { id: "contact" as const, label: "Contact", icon: Phone },
    ];
    return [
      ...base,
      ...(variant === "employee"
        ? [
            {
              id: "employment" as const,
              label: "Employment",
              icon: CalendarDays,
            },
          ]
        : []),
      { id: "access" as const, label: "Access", icon: ShieldCheck },
      { id: "password" as const, label: "Password", icon: KeyRound },
    ];
  }, [variant]);

  async function submitProfile(section: SectionId, formData: FormData) {
    setBusy(true);
    setNotice(null);
    try {
      let body;
      if (section === "contact") {
        body = {
          name: profile?.name ?? sessionUser?.name ?? displayName,
          phone: String(formData.get("phone") ?? "") || null,
          avatarUrl: uploadedAvatarUrl ?? profile?.avatarUrl ?? null,
        };
      } else if (isAdminProfile) {
        body = {
          name: String(formData.get("name") ?? ""),
          avatarUrl: uploadedAvatarUrl ?? profile?.avatarUrl ?? null,
        };
      } else {
        body = {
          avatarUrl: uploadedAvatarUrl ?? profile?.avatarUrl ?? null,
          profile: {
            firstName: employeeProfile.firstName ?? "",
            fatherName: employeeProfile.fatherName ?? "",
            gender: employeeProfile.gender ?? "",
            ...Object.fromEntries(
              Array.from(formData.entries()).map(([key, formValue]) => [
                key,
                String(formValue) || null,
              ]),
            ),
          },
        };
      }
      const response = await fetch("/api/backend/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error ?? "Could not save profile.");
      const savedProfile = payload.data as DashboardProfile | null;
      const savedEmployeeProfile = savedProfile?.profile ?? {};
      const savedFullName = [
        savedEmployeeProfile.firstName,
        savedEmployeeProfile.fatherName,
        savedEmployeeProfile.grandfatherName,
      ]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");
      const savedTopBarName = [
        savedEmployeeProfile.firstName,
        savedEmployeeProfile.fatherName,
      ]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");
      setProfile(payload.data ?? profile);
      setUploadedAvatarUrl(null);
      setAvatarPreviewUrl(null);
      window.dispatchEvent(
        new CustomEvent("dashboard-profile-updated", {
          detail: {
            name: savedTopBarName || savedFullName || savedProfile?.name,
            avatarUrl: savedProfile?.avatarUrl,
          },
        }),
      );
      setEditMode(false);
      setNotice({ tone: "success", message: "Profile updated successfully." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not save profile.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(formData: FormData) {
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    setBusy(true);
    setNotice(null);
    try {
      if (newPassword !== confirmPassword)
        throw new Error("Password confirmation does not match.");
      const response = await fetch("/api/backend/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error ?? "Could not change password.");
      setNotice({ tone: "success", message: "Password changed successfully." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not change password.",
      });
    } finally {
      setBusy(false);
    }
  }

  function sectionButton(id: SectionId) {
    if (id === "employment" || id === "access" || id === "password") {
      setEditMode(false);
      setUploadedAvatarUrl(null);
      setAvatarPreviewUrl(null);
    }
    setActiveSection(id);
  }

  function startEditMode() {
    setActiveSection(isAdminProfile ? "personal" : "contact");
    setEditMode(true);
    setNotice(null);
  }

  function cancelEditMode() {
    setEditMode(false);
    setUploadedAvatarUrl(null);
    setAvatarPreviewUrl(null);
    setNotice(null);
  }

  async function handleAvatarFile(file?: File | null) {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setNotice({
        tone: "error",
        message: "Please upload a JPG, PNG, or WEBP image.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({
        tone: "error",
        message: "Profile image must be 5MB or smaller.",
      });
      return;
    }

    setUploadingAvatar(true);
    setNotice(null);
    const localPreview = URL.createObjectURL(file);
    setAvatarPreviewUrl(localPreview);
    try {
      const url = await uploadAvatar(file);
      setUploadedAvatarUrl(url);
      setAvatarPreviewUrl(url);
      setNotice({
        tone: "success",
        message: "Image ready. Click Update to save it.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Image upload failed.",
      });
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(localPreview);
    }
  }

  function handleProfileSubmit(section: SectionId) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitProfile(section, new FormData(event.currentTarget));
    };
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPassword(new FormData(event.currentTarget));
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
              {variant}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Profile Settings
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Review profile details, update employee information, and manage
              password access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {effectiveAvatarUrl ? (
              <img
                src={effectiveAvatarUrl}
                alt={displayName}
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-slate-100"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-slate-900 text-2xl font-black text-white">
                {initials(displayName, profile?.email ?? sessionUser?.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                {variant}
              </p>
              <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-slate-950">
                {displayName}
              </h1>
              <p className="mt-1 truncate text-sm font-bold text-slate-500">
                {displayFirstFather ||
                  value(profile?.email ?? sessionUser?.email)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  <Mail className="h-3.5 w-3.5" />
                  {value(profile?.email ?? sessionUser?.email)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {assignedRole}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-[260px]">
            {editMode ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  {effectiveAvatarUrl ? (
                    <img
                      src={effectiveAvatarUrl}
                      alt={displayName}
                      className="h-14 w-14 rounded-2xl object-cover ring-4 ring-white"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white ring-4 ring-white">
                      {initials(
                        displayName,
                        profile?.email ?? sessionUser?.email,
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">
                      Profile picture
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      JPG, PNG, or WEBP up to 5MB
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    {uploadingAvatar ? "Uploading..." : "Upload"}
                  </button>
                  {uploadedAvatarUrl || avatarPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedAvatarUrl(null);
                        setAvatarPreviewUrl(null);
                        if (avatarInputRef.current)
                          avatarInputRef.current.value = "";
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                      Cancel image
                    </button>
                  ) : null}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={(event) =>
                      void handleAvatarFile(event.target.files?.[0])
                    }
                  />
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {editMode ? (
                <>
                  <button
                    type="submit"
                    form={activeFormId}
                    disabled={busy || !activeFormId}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {busy ? "Updating..." : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditMode}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEditMode}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("password");
                      setEditMode(false);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800"
                  >
                    <Lock className="h-4 w-4" />
                    Reset Password
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {notice ? (
        <div
          className={cn(
            "rounded-2xl border px-5 py-3 text-sm font-bold",
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          {notice.message}
        </div>
      ) : null}

      <DashboardAppearanceSettings />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24">
          <nav className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon;
              const selected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => sectionButton(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition",
                    selected
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      selected ? "text-emerald-300" : "text-slate-400",
                    )}
                  />
                  <span className="text-xs font-black uppercase tracking-wide">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  {sections.find((s) => s.id === activeSection)?.label}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Profile detail
                </h2>
              </div>
            </div>

            {activeSection === "personal" ? (
              editMode ? (
                isAdminProfile ? (
                  <form
                    id="profile-personal-form"
                    onSubmit={handleProfileSubmit("personal")}
                    className="grid gap-4 md:grid-cols-2"
                  >
                    <Field
                      label="Display name"
                      name="name"
                      defaultValue={profile?.name ?? sessionUser?.name}
                      required
                    />
                    <Detail
                      label="Email Address"
                      value={value(profile?.email ?? sessionUser?.email)}
                    />
                  </form>
                ) : (
                  <form
                    id="profile-personal-form"
                    onSubmit={handleProfileSubmit("personal")}
                    className="grid gap-4 md:grid-cols-3"
                  >
                    <Field
                      label="First name"
                      name="firstName"
                      defaultValue={employeeProfile.firstName}
                      required
                    />
                    <Field
                      label="Father name"
                      name="fatherName"
                      defaultValue={employeeProfile.fatherName}
                      required
                    />
                    <Field
                      label="Grandfather name"
                      name="grandfatherName"
                      defaultValue={employeeProfile.grandfatherName}
                    />
                    <Field
                      label="Gender"
                      name="gender"
                      defaultValue={employeeProfile.gender}
                      required
                    />
                    <Field
                      label="Date of birth"
                      name="dateOfBirth"
                      type="date"
                      defaultValue={dateInput(employeeProfile.dateOfBirth)}
                    />
                    <Field
                      label="Marital status"
                      name="maritalStatus"
                      defaultValue={employeeProfile.maritalStatus}
                    />
                  </form>
                )
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {isAdminProfile ? (
                    <>
                      <Detail label="Display Name" value={displayName} />
                      <Detail
                        label="Email Address"
                        value={value(profile?.email ?? sessionUser?.email)}
                      />
                      <Detail
                        label="Workspace Role"
                        value={titleCase(
                          profile?.role ?? sessionUser?.role ?? variant,
                        )}
                      />
                      <Detail
                        label="Account Status"
                        value={titleCase(profile?.accountStatus ?? "active")}
                      />
                    </>
                  ) : (
                    <>
                      <Detail label="Full Name" value={displayName} />
                      <Detail
                        label="First Name"
                        value={value(employeeProfile.firstName)}
                      />
                      <Detail
                        label="Father Name"
                        value={value(employeeProfile.fatherName)}
                      />
                      <Detail
                        label="Grandfather Name"
                        value={value(employeeProfile.grandfatherName)}
                      />
                      <Detail
                        label="Gender"
                        value={titleCase(employeeProfile.gender)}
                      />
                      <Detail
                        label="Date of Birth"
                        value={dateDisplay(employeeProfile.dateOfBirth)}
                      />
                      <Detail
                        label="Marital Status"
                        value={titleCase(employeeProfile.maritalStatus)}
                      />
                    </>
                  )}
                </div>
              )
            ) : null}

            {activeSection === "contact" ? (
              editMode ? (
                <form
                  id="profile-contact-form"
                  onSubmit={handleProfileSubmit("contact")}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field
                    label="Phone"
                    name="phone"
                    defaultValue={profile?.phone}
                  />
                </form>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Detail
                    label="Email Address"
                    value={value(profile?.email ?? sessionUser?.email)}
                  />
                  <Detail label="Phone Number" value={value(profile?.phone)} />
                  {!isAdminProfile ? (
                    <>
                      <Detail
                        label="Country"
                        value={value(employeeProfile.country)}
                      />
                      <Detail
                        label="City"
                        value={value(employeeProfile.city)}
                      />
                      <Detail
                        label="Address"
                        value={value(employeeProfile.address)}
                      />
                    </>
                  ) : null}
                </div>
              )
            ) : null}

            {activeSection === "employment" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Detail
                  label="Employment Type"
                  value={titleCase(employeeProfile.employmentType)}
                />
                <Detail
                  label="Start Date"
                  value={dateDisplay(employeeProfile.startDate)}
                />
                <Detail
                  label="Invite Status"
                  value={titleCase(employeeProfile.inviteStatus)}
                />
                <Detail label="Notes" value={value(employeeProfile.notes)} />
                <Detail
                  label="Location"
                  value={
                    `${value(employeeProfile.city, "")}${employeeProfile.city && employeeProfile.country ? ", " : ""}${value(employeeProfile.country, "")}` ||
                    "Not provided"
                  }
                />
                <Detail
                  label="Address"
                  value={value(employeeProfile.address)}
                />
              </div>
            ) : null}

            {activeSection === "access" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Detail
                  label="Workspace Role"
                  value={titleCase(
                    profile?.role ?? sessionUser?.role ?? variant,
                  )}
                />
                <Detail label="Assigned Role" value={assignedRole} />
                <Detail
                  label="Role Status"
                  value={titleCase(profile?.roleStatus ?? "assigned")}
                />
                <Detail
                  label="Account Status"
                  value={titleCase(profile?.accountStatus ?? "active")}
                />
                <Detail
                  label="Created Date"
                  value={dateDisplay(profile?.createdAt)}
                />
                <Detail
                  label="Last Login"
                  value={
                    profile?.lastLoginAt
                      ? new Date(profile.lastLoginAt).toLocaleString()
                      : "Not provided"
                  }
                />
              </div>
            ) : null}

            {activeSection === "password" ? (
              <form
                onSubmit={handlePasswordSubmit}
                className="grid gap-4 md:grid-cols-3"
              >
                <Field
                  label="Current password"
                  name="currentPassword"
                  type="password"
                  required
                />
                <Field
                  label="New password"
                  name="newPassword"
                  type="password"
                  required
                />
                <Field
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  required
                />
                <button
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  Change Password
                </button>
              </form>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
