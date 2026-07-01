"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, FileText, Loader2, Shield, User2, MapPin, NotebookPen, Lock, Unlock, RotateCcw, Trash2, Edit, X, RefreshCw, ArrowLeft, Users } from "lucide-react";
import { dashboardConfirm, dashboardError, dashboardLoading, dashboardSuccess, dashboardAlert } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";

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
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email?.slice(0, 2)?.toUpperCase() || "—"
  );
}

function badgeTone(kind: "account" | "roleStatus" | "invite", value?: string | null) {
  const v = String(value ?? "").toLowerCase();
  if (kind === "account") {
    if (v === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (v === "invited" || v === "pending") return "bg-blue-100 text-blue-800 border-blue-200";
    if (v === "inactive" || v === "blocked" || v === "suspended") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  }
  if (kind === "roleStatus") {
    if (v === "assigned") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (v === "unassigned") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  }
  if (kind === "invite") {
    if (v === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
    if (v === "none") return "bg-slate-100 text-slate-800 border-slate-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function getAccessStatus(user: EmployeeUser) {
  const status = String(user.status ?? "").toLowerCase();
  if (status !== "active") {
    return "Blocked";
  }

  return user.isOnline ? "Online" : "Offline";
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string;
}) {
  const display = value && String(value).trim() ? value : "Not provided";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      {href ? (
        <a href={href} className="mt-1 block text-sm font-semibold text-blue-900 hover:underline">
          {display}
        </a>
      ) : (
        <div className="mt-1 text-sm font-semibold text-slate-950">{display}</div>
      )}
    </div>
  );
}

function TextInput({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </label>
  );
}

function SelectInput({
  label,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePhone(value: string) {
  return /^[+\d][\d\s-]{6,24}$/.test(value.trim());
}

function validateName(value: string) {
  const nameRegex = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF' -]+$/;
  return nameRegex.test(value.trim());
}

type CloudinarySignedPayload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

type ApiResponse<T> = {
  message?: string;
  data?: T;
};

type EmployeeSectionId = "personal" | "contact" | "account" | "access" | "activity" | "notes";

type EmployeeUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
  accountStatus?: string | null;
  roleStatus?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  mustChangePassword?: boolean | null;
  passwordStatus?: string | null;
  lastPasswordResetRequestedAt?: string | null;
  lastPasswordResetAt?: string | null;
  lastPasswordResetMethod?: string | null;
  [key: string]: unknown;
};

type EmployeeProfile = {
  firstName?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  maritalStatus?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  inviteStatus?: string | null;
  notes?: string | null;
  [key: string]: unknown;
};

type AssignedRole = {
  id?: string;
  name?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

type ActivityItem = {
  id?: string | number;
  action?: string | null;
  entityType?: string | null;
  details?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

async function uploadPhoto(file: File) {
  const signRes = await fetch("/api/backend/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "employees/avatars" }),
  });
  if (!signRes.ok) throw new Error("Could not start upload");
  const signedPayload = (await signRes.json()) as ApiResponse<CloudinarySignedPayload>;
  const signed = signedPayload.data;
  if (!signed) throw new Error("Could not start upload");

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

type EmployeePayload = {
  user: EmployeeUser;
  profile: EmployeeProfile;
  assignedRole: AssignedRole | null;
  permissions: string[];
  activity: ActivityItem[];
  handledOrders?: Array<Record<string, unknown>>;
};

export function EmployeeDetailClient({
  initialPayload,
  backTab,
  canAssignRole,
  canEdit,
  canUpdateStatus,
  canDelete,
  currentUserId,
  embedded = false,
}: {
  initialPayload: EmployeePayload;
  backTab: string;
  canAssignRole: boolean;
  canEdit: boolean;
  canUpdateStatus: boolean;
  canDelete: boolean;
  currentUserId?: string;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const swalTargetRef = useRef<HTMLDivElement | null>(null);
  const [payload, setPayload] = useState<EmployeePayload>(initialPayload);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<EmployeeSectionId>("personal");
  const [topNotice, setTopNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email_link" | "temp_password">("email_link");
  const [resetFlowNotice, setResetFlowNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetPasswordNotice, setResetPasswordNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const passwordRules = {
    minLength: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isPasswordValid =
    passwordRules.minLength && passwordRules.uppercase && passwordRules.lowercase && passwordRules.number && passwordRules.special;
  const doPasswordsMatch = newPassword.length > 0 && confirmNewPassword.length > 0 && newPassword === confirmNewPassword;
  const canSubmitResetPassword = !busy && isPasswordValid && doPasswordsMatch;

  const user = payload.user;
  const profile = payload.profile ?? {};
  const assignedRole = payload.assignedRole ?? null;
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  const activity = Array.isArray(payload.activity) ? payload.activity : [];

  function showTopNotice(tone: "success" | "error", title: string, message: string) {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
    setTopNotice({ tone, title, message });
    noticeTimeoutRef.current = setTimeout(() => {
      setTopNotice(null);
      noticeTimeoutRef.current = null;
    }, 4000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const computedFullName = String(
    user?.name || [profile?.firstName, profile?.fatherName, profile?.grandfatherName].filter(Boolean).join(" "),
  ).trim();
  const displayName = computedFullName ? computedFullName : "Unnamed Employee";

  const [firstName, setFirstName] = useState(String(profile.firstName ?? ""));
  const [fatherName, setFatherName] = useState(String(profile.fatherName ?? ""));
  const [grandfatherName, setGrandfatherName] = useState(String(profile.grandfatherName ?? ""));
  const [gender, setGender] = useState(String(profile.gender ?? ""));
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "");
  const [maritalStatus, setMaritalStatus] = useState(String(profile.maritalStatus ?? ""));

  const [email, setEmail] = useState(String(user.email ?? ""));
  const [phone, setPhone] = useState(String(user.phone ?? ""));
  const [country, setCountry] = useState(String(profile.country ?? ""));
  const [city, setCity] = useState(String(profile.city ?? ""));
  const [address, setAddress] = useState(String(profile.address ?? ""));

  const [accountStatus, setAccountStatus] = useState(String(user.accountStatus ?? "active"));
  const [inviteStatus, setInviteStatus] = useState(String(profile.inviteStatus ?? "none"));
  const [notes, setNotes] = useState(String(profile.notes ?? ""));

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const originalRef = useRef({
    firstName,
    fatherName,
    grandfatherName,
    gender,
    dateOfBirth,
    maritalStatus,
    email,
    phone,
    country,
    city,
    address,
    accountStatus,
    inviteStatus,
    notes,
    avatarUrl: user.avatarUrl ?? null,
  });

  // `panel` may be provided by the parent via querystring or other prop.
  // Ensure it's always defined to avoid runtime ReferenceError when referenced below.
  const panel = (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("panel") || backTab
    : backTab) as string | null;

  function isDirty() {
    const original = originalRef.current;
    return (
      original.firstName !== firstName ||
      original.fatherName !== fatherName ||
      original.grandfatherName !== grandfatherName ||
      original.gender !== gender ||
      original.dateOfBirth !== dateOfBirth ||
      original.maritalStatus !== maritalStatus ||
      original.email !== email ||
      original.phone !== phone ||
      original.country !== country ||
      original.city !== city ||
      original.address !== address ||
      original.accountStatus !== accountStatus ||
      original.inviteStatus !== inviteStatus ||
      original.notes !== notes ||
      Boolean(photoFile) ||
      Boolean(photoRemoved)
    );
  }

  function enterEditMode() {
    if (!canEdit) return;
    const current = payload.user;
    const currentProfile = payload.profile ?? {};
    setFirstName(String(currentProfile.firstName ?? ""));
    setFatherName(String(currentProfile.fatherName ?? ""));
    setGrandfatherName(String(currentProfile.grandfatherName ?? ""));
    setGender(String(currentProfile.gender ?? ""));
    setDateOfBirth(currentProfile.dateOfBirth ? String(currentProfile.dateOfBirth).slice(0, 10) : "");
    setMaritalStatus(String(currentProfile.maritalStatus ?? ""));
    setEmail(String(current.email ?? ""));
    setPhone(String(current.phone ?? ""));
    setCountry(String(currentProfile.country ?? ""));
    setCity(String(currentProfile.city ?? ""));
    setAddress(String(currentProfile.address ?? ""));
    setAccountStatus(String(current.accountStatus ?? "active"));
    setInviteStatus(String(currentProfile.inviteStatus ?? "none"));
    setNotes(String(currentProfile.notes ?? ""));
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(false);

    originalRef.current = {
      firstName: String(currentProfile.firstName ?? ""),
      fatherName: String(currentProfile.fatherName ?? ""),
      grandfatherName: String(currentProfile.grandfatherName ?? ""),
      gender: String(currentProfile.gender ?? ""),
      dateOfBirth: currentProfile.dateOfBirth ? String(currentProfile.dateOfBirth).slice(0, 10) : "",
      maritalStatus: String(currentProfile.maritalStatus ?? ""),
      email: String(current.email ?? ""),
      phone: String(current.phone ?? ""),
      country: String(currentProfile.country ?? ""),
      city: String(currentProfile.city ?? ""),
      address: String(currentProfile.address ?? ""),
      accountStatus: String(current.accountStatus ?? "active"),
      inviteStatus: String(currentProfile.inviteStatus ?? "none"),
      notes: String(currentProfile.notes ?? ""),
      avatarUrl: current.avatarUrl ?? null,
    };
    setEditMode(true);
  }

  async function cancelEditMode() {
    if (!editMode) return;
    if (isDirty()) {
      const confirmed = await dashboardConfirm({
        title: "Discard changes?",
        text: "Your unsaved changes will be lost.",
        confirmButtonText: "Discard",
        cancelButtonText: "Continue Editing",
        tone: "warning",
        icon: "warning",
        target: swalTargetRef.current ?? undefined,
      });
      if (!confirmed) return;
    }
    setEditMode(false);
    const original = originalRef.current;
    setFirstName(original.firstName);
    setFatherName(original.fatherName);
    setGrandfatherName(original.grandfatherName);
    setGender(original.gender);
    setDateOfBirth(original.dateOfBirth);
    setMaritalStatus(original.maritalStatus);
    setEmail(original.email);
    setPhone(original.phone);
    setCountry(original.country);
    setCity(original.city);
    setAddress(original.address);
    setAccountStatus(original.accountStatus);
    setInviteStatus(original.inviteStatus);
    setNotes(original.notes);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(false);
  }

  async function reloadDetails() {
    const res = await fetch(`/api/backend/admin/users/${user.id}`);
    const json = (await res.json().catch(() => null)) as ApiResponse<EmployeePayload> | null;
    if (!res.ok) throw new Error(String(json?.message ?? "Unable to reload employee details."));
    if (!json?.data) throw new Error("Unable to reload employee details.");
    setPayload(json.data);
  }

  async function updateEmployee() {
    if (busy) return;

    const cleanFirst = firstName.trim();
    const cleanFather = fatherName.trim();
    if (!cleanFirst) return await dashboardError("Validation Error", "First Name is required.");
    if (!cleanFather) return await dashboardError("Validation Error", "Father’s Name is required.");
    if (!validateName(cleanFirst) || !validateName(cleanFather) || (grandfatherName.trim() && !validateName(grandfatherName))) {
      return await dashboardError("Validation Error", "Please use letters only for name fields.");
    }

    if (!email.trim()) return await dashboardError("Validation Error", "Email Address is required.");
    if (!validateEmail(email)) return await dashboardError("Validation Error", "Please enter a valid email address.");

    if (!phone.trim()) return await dashboardError("Validation Error", "Phone Number is required.");
    if (!validatePhone(phone)) return await dashboardError("Validation Error", "Please enter a valid phone number.");

    if (!gender.trim()) return await dashboardError("Validation Error", "Gender is required.");
    if (!accountStatus) return await dashboardError("Validation Error", "Account Status is required.");

    if (photoFile) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      const maxBytes = 5 * 1024 * 1024;
      if (!allowed.includes(photoFile.type) || photoFile.size > maxBytes) {
        return showTopNotice("error", "Validation Error", "Please upload a JPG, PNG, or WEBP image within the allowed file size.");
      }
    }

    setBusy(true);
    try {
      let avatarUrl: string | null | undefined = undefined;
      if (photoRemoved) avatarUrl = null;
      else if (photoFile) avatarUrl = await uploadPhoto(photoFile);

      const fullName = [cleanFirst, cleanFather, grandfatherName.trim()].filter(Boolean).join(" ");

      const res = await fetch(`/api/backend/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: email.trim(),
          phone: phone.trim(),
          accountStatus,
          avatarUrl,
          profile: {
            firstName: cleanFirst,
            fatherName: cleanFather,
            grandfatherName: grandfatherName.trim() ? grandfatherName.trim() : null,
            gender: gender.trim(),
            dateOfBirth: dateOfBirth ? dateOfBirth : null,
            maritalStatus: maritalStatus.trim() ? maritalStatus.trim() : null,
            country: country.trim() ? country.trim() : null,
            city: city.trim() ? city.trim() : null,
            address: address.trim() ? address.trim() : null,
            inviteStatus: inviteStatus.trim() ? inviteStatus.trim() : null,
            notes: notes.trim() ? notes.trim() : null,
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (!res.ok) {
        const message = String(json?.message ?? "Unable to update employee information. Please try again.");
        if (res.status === 409) {
          await dashboardError("Validation Error", "This email is already registered.");
        } else {
          await dashboardError("Update Failed", message);
        }
        return;
      }

      await dashboardSuccess("Employee Updated", "Employee information has been updated successfully.");
      setEditMode(false);
      await reloadDetails();
      router.refresh();
    } catch (e) {
      await dashboardError("Update Failed", e instanceof Error ? e.message : "Unable to update employee information. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!canUpdateStatus) return;
    const currentStatus = String(user.status ?? "").toLowerCase();
    const currentAccountStatus = String(user.accountStatus ?? "").toLowerCase();
    const isBlocked =
      currentStatus === "inactive" || currentAccountStatus === "blocked";
    const confirmed = await dashboardConfirm({
      title: isBlocked ? "Activate this account?" : "Deactivate this account?",
      text: isBlocked
        ? "Activating will restore dashboard access for this employee and send an email notification."
        : "Deactivating will remove dashboard access for this employee and send an email notification.",
      confirmButtonText: isBlocked ? "Yes, activate" : "Yes, deactivate",
      cancelButtonText: "No, cancel",
      tone: isBlocked ? "success" : "warning",
      icon: "warning",
      target: swalTargetRef.current ?? undefined,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      dashboardLoading(isBlocked ? "Activating..." : "Deactivating...", "Please wait a moment.", {
        target: swalTargetRef.current ?? undefined,
      });
      const res = await fetch(`/api/backend/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isBlocked ? "active" : "inactive" }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (!res.ok) {
        throw new Error(String(json?.message ?? "Could not update user status."));
      }

      // Close loading state before showing final feedback.
      dashboardLoading.close();

      await dashboardAlert(
        isBlocked ? "Account Activated" : "Account Deactivated",
        isBlocked
          ? "Employee account has been activated successfully. Notification emails have been sent."
          : "Employee account has been deactivated successfully. Notification emails have been sent.",
        { target: swalTargetRef.current ?? undefined, icon: "success", tone: "success", confirmButtonText: "OK" },
      );
      await reloadDetails();
      router.refresh();
    } catch (e) {
      dashboardLoading.close();
      await dashboardAlert("Update Failed", e instanceof Error ? e.message : "Could not update user status.", {
        target: swalTargetRef.current ?? undefined,
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
    } finally {
      setBusy(false);
    }
  }

  function openResetPasswordModal() {
    setResetMethod("email_link");
    setResetFlowNotice(null);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setResetPasswordNotice(null);
    setResetPasswordOpen(true);
  }

  async function sendResetLink() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${user.id}/password-reset-link`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Unable to send reset link."));
      setResetFlowNotice({
        tone: "success",
        message: "A secure password reset link has been sent to the user’s email address.",
      });
      await dashboardSuccess("Password Reset Link Sent", "A secure password reset link has been sent to the user’s email address.", {
        target: swalTargetRef.current ?? undefined,
      });
      await reloadDetails();
      router.refresh();
    } catch (e) {
      setResetFlowNotice({ tone: "error", message: e instanceof Error ? e.message : "Unable to send reset link." });
      await dashboardError("Password Reset Failed", e instanceof Error ? e.message : "Unable to send reset link. Please try again.", {
        target: swalTargetRef.current ?? undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitResetPassword() {
    if (!isPasswordValid || !doPasswordsMatch) {
      await dashboardError(
        "Validation Error",
        "Please make sure the password meets all requirements and matches the confirmation password.",
        { target: swalTargetRef.current ?? undefined },
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (!res.ok) throw new Error(String(json?.message ?? "Could not reset password."));
      setResetPasswordOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setResetPasswordNotice(null);
      await dashboardSuccess("Password Reset Successfully", "Employee password has been updated successfully.", {
        target: swalTargetRef.current ?? undefined,
      });
      await reloadDetails();
      router.refresh();
    } catch (e) {
      await dashboardError("Password Reset Failed", e instanceof Error ? e.message : "Unable to reset password. Please try again.", {
        target: swalTargetRef.current ?? undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee() {
    if (activity.length > 0) {
      await dashboardError(
        "Cannot Delete Account",
        "This account can’t be deleted because it has activity history. Please block the account instead.",
        { target: swalTargetRef.current ?? undefined },
      );
      return;
    }

    if (currentUserId && user.id === currentUserId) {
      await dashboardError("Delete Failed", "You cannot delete your own account.", { target: swalTargetRef.current ?? undefined });
      return;
    }

    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: "This employee account will be permanently deleted. This action cannot be undone.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
      target: swalTargetRef.current ?? undefined,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      dashboardLoading("Deleting…", "Please wait a moment.", { target: swalTargetRef.current ?? undefined });
      const res = await fetch(`/api/backend/admin/users/${user.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (!res.ok) {
        const message = String(json?.message ?? "Could not delete user.");
        if (res.status === 409 || /history|activity|audit/i.test(message)) {
          dashboardLoading.close();
          await dashboardAlert("Cannot Delete Account", "This account can’t be deleted because it has activity history. Please block the account instead.", {
            target: swalTargetRef.current ?? undefined,
            icon: "warning",
            tone: "warning",
            confirmButtonText: "OK",
          });
          return;
        }
        throw new Error(message);
      }
      dashboardLoading.close();
      await dashboardAlert("Deleted Successfully", "Employee account has been deleted successfully.", {
        target: swalTargetRef.current ?? undefined,
        icon: "success",
        tone: "success",
        confirmButtonText: "OK",
      });
      router.push(`/admin/users?tab=${encodeURIComponent(backTab)}`);
      router.refresh();
    } catch (e) {
      dashboardLoading.close();
      await dashboardAlert("Delete Failed", e instanceof Error ? e.message : "Unable to delete employee. Please try again.", {
        target: swalTargetRef.current ?? undefined,
        icon: "error",
        tone: "danger",
        confirmButtonText: "OK",
      });
    } finally {
      setBusy(false);
    }
  }

  const inviteStatusValue = profile?.inviteStatus ?? "none";
  const roleStatusValue = user?.roleStatus ?? "unassigned";
  const userStatusValue = String(user.status ?? "").toLowerCase();
  const userAccountStatusValue = String(user.accountStatus ?? "").toLowerCase();
  const isBlockedForUi = userStatusValue === "inactive" || userAccountStatusValue === "blocked" || userAccountStatusValue === "inactive";
  const accessStatusLabel = getAccessStatus(user);

  function goToSection(sectionId: EmployeeSectionId) {
    setActiveSection(sectionId);
    if (typeof window === "undefined") return;
    const node = document.getElementById(sectionId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <AdminDetailLayout
      embedded={embedded}
      topHeader={
        <AdminDetailHeader
          icon={Users}
          iconTheme="bg-[#f5f3ff] text-[#8b5cf6]"
          category="Users"
          title={displayName}
          subtitle="Manage staff accounts, roles, activity, and performance."
          onRefresh={() => {
            router.refresh();
            dashboardSuccess("Page Refreshed", "The employee details have been reloaded.");
          }}
          onBack={() => router.push(`/admin/users?tab=${encodeURIComponent(backTab)}`)}
          backLabel="Back to Users"
        />
      }
      topNotice={
        topNotice ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm shadow-sm",
              topNotice.tone === "success"
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
            aria-live="polite"
          >
            <p className="font-bold">{topNotice.title}</p>
            <p className="mt-0.5">{topNotice.message}</p>
          </div>
        ) : null
      }
      sections={[
        { id: "personal", label: "Identity Profile", icon: User2 },
        { id: "contact", label: "Contact Details", icon: MapPin },
        { id: "account", label: "Security & Type", icon: FileText },
        { id: "access", label: "Roles & Permissions", icon: Shield },
        { id: "activity", label: "Activity Logs", icon: RotateCcw },
        { id: "notes", label: "Internal Notes", icon: NotebookPen },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => goToSection(id as EmployeeSectionId)}
      profileCard={
        <div ref={swalTargetRef} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              {user.avatarUrl && !photoRemoved && !photoPreview ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="h-[180px] w-[180px] rounded-2xl border border-slate-200 object-cover"
                />
              ) : photoPreview ? (
                <img
                  src={photoPreview}
                  alt={displayName}
                  className="h-[180px] w-[180px] rounded-2xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-3xl font-bold text-slate-600">
                  {initials(displayName, user.email)}
                </div>
              )}

              {editMode ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPhotoFile(file);
                      setPhotoRemoved(false);
                      if (file) setPhotoPreview(URL.createObjectURL(file));
                      else setPhotoPreview(null);
                    }}
                    className="block w-[180px] text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-900 hover:file:bg-blue-100"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setPhotoRemoved(true);
                      }}
                      className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                      Remove photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setPhotoRemoved(false);
                      }}
                      className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                      Keep current
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                {String(user.accountStatus ?? "").toLowerCase() === "inactive" ? (
                  <Lock className="h-5 w-5 text-blue-600" />
                ) : (
                  <User2 className="h-5 w-5 text-slate-600" />
                )}
                <span>{displayName}</span>
              </h1>
              <div className="mt-1 text-sm text-slate-600">Employee ID: {user.id}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone("account", isBlockedForUi ? "inactive" : "active")}`}>
                  {accessStatusLabel}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone("roleStatus", roleStatusValue)}`}>
                  {String(roleStatusValue ?? "Not provided")}
                </span>
                {assignedRole?.name ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    {assignedRole.name}
                  </span>
                ) : null}
                {inviteStatusValue ? (
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone("invite", inviteStatusValue)}`}>
                    Invite: {String(inviteStatusValue)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-col gap-1 text-sm text-slate-700">
                <a className="hover:underline" href={`mailto:${user.email}`}>
                  {user.email}
                </a>
                <a className="hover:underline" href={user.phone ? `tel:${user.phone}` : undefined}>
                  {user.phone ?? "Not provided"}
                </a>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto"> 
            {!editMode ? (
              <>
                {canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={enterEditMode}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8]"
                    >
                      <Edit className="h-4 w-4" />
                      Edit User
                    </button>
                    {canUpdateStatus ? (
                      <button
                        type="button"
                        onClick={toggleBlock}
                        disabled={busy}
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50",
                          isBlockedForUi ? "bg-[#16A34A] hover:bg-[#15803D]" : "bg-[#EA580C] hover:bg-[#C2410C]",
                        )}
                      >
                        {isBlockedForUi ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {isBlockedForUi ? "Activate Account" : "Deactivate Account"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={openResetPasswordModal}
                      disabled={busy}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#6D28D9] disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Password
                    </button>
                  </>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={deleteEmployee}
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#DC2626] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={updateEmployee}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update
                </button>
                <button
                  type="button"
                  onClick={cancelEditMode}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      }
    >
      <Dialog
        open={resetPasswordOpen}
        onOpenChange={(next) => {
          if (!next) {
            setResetFlowNotice(null);
            setNewPassword("");
            setConfirmNewPassword("");
          }
          setResetPasswordOpen(next);
        }}
      >
        {/* @ts-ignore */}
        <DialogContent className="max-w-md">
          {/* @ts-ignore */}
          <DialogHeader>
            {/* @ts-ignore */}
            <DialogTitle className="font-extrabold tracking-wide">RESET PASSWORD OPTIONS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {resetFlowNotice ? (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  resetFlowNotice.tone === "success"
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
                )}
                aria-live="polite"
              >
                {resetFlowNotice.message}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-900">Choose reset method</div>
              <div className="mt-2 space-y-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    resetMethod === "email_link" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="reset-method"
                    checked={resetMethod === "email_link"}
                    onChange={() => setResetMethod("email_link")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Send Reset Link by Email{" "}
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Recommended
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      A secure password reset link will be sent to the user’s email address. The user will create their own new password.
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    resetMethod === "temp_password" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="reset-method"
                    checked={resetMethod === "temp_password"}
                    onChange={() => setResetMethod("temp_password")}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Set Temporary Password <span className="ml-2 text-xs font-semibold text-slate-500">Admin Only</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">Set a temporary password. The user must change it after signing in.</div>
                  </div>
                </label>
              </div>
            </div>

            {resetMethod === "email_link" ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetFlowNotice(null);
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setResetPasswordOpen(false);
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendResetLink()}
                  disabled={busy}
                  className="inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </button>
              </div>
            ) : null}

            {resetMethod === "temp_password" ? (
              <>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">New Password</span>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setResetPasswordNotice(null);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                {[
                  { key: "minLength", label: "At least 8 characters", ok: passwordRules.minLength },
                  { key: "uppercase", label: "At least one uppercase letter", ok: passwordRules.uppercase },
                  { key: "lowercase", label: "At least one lowercase letter", ok: passwordRules.lowercase },
                  { key: "number", label: "At least one number", ok: passwordRules.number },
                  { key: "special", label: "At least one special character", ok: passwordRules.special },
                ].map((rule) => (
                  <div key={rule.key} className={cn("flex items-center gap-2", rule.ok ? "text-emerald-700" : "text-slate-500")}>
                    {rule.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    <span className={cn(rule.ok ? "font-semibold" : "")}>{rule.label}</span>
                  </div>
                ))}
              </div>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Confirm Password</span>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    setResetPasswordNotice(null);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                  aria-label={showConfirmNewPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmNewPassword.length > 0 ? (
                doPasswordsMatch ? (
                  <span className="mt-1 block text-xs font-semibold text-emerald-700">Passwords match.</span>
                ) : (
                  <span className="mt-1 block text-xs font-semibold text-rose-600">Passwords do not match.</span>
                )
              ) : null}
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetFlowNotice(null);
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setResetPasswordNotice(null);
                  setResetPasswordOpen(false);
                }}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitResetPassword()}
                disabled={!canSubmitResetPassword}
                className="inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Password
              </button>
            </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

        {activeSection === "access" ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Roles &amp; Permissions</h2>
                    {String(roleStatusValue).toLowerCase() !== "assigned" || !assignedRole ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <h3 className="text-sm font-bold text-amber-900">No Role Assigned Yet</h3>
                        <p className="mt-1 text-sm text-amber-900/80">
                          This employee account exists, but no role or permissions have been assigned yet.
                        </p>
                        <div className="mt-4">
                          <Link
                            href={canAssignRole ? `/admin/roles?tab=access&employeeId=${encodeURIComponent(user.id)}` : "#"}
                            className={`inline-flex h-10 items-center rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950 ${
                              canAssignRole ? "" : "pointer-events-none opacity-50"
                            }`}
                          >
                            Assign Role
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <Field label="Assigned Role" value={assignedRole?.name} />
                          <Field label="Role Description" value={assignedRole?.description} />
                          <Field label="Permissions Count" value={permissions.length ? String(permissions.length) : "0"} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold text-slate-600">Permission Keys</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {permissions.length ? (
                              permissions.slice(0, 80).map((p) => (
                                <span
                                  key={String(p)}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                                >
                                  {String(p)}
                                </span>
                              ))
                            ) : (
                              <div className="text-sm font-semibold text-slate-800">Not provided</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                ) : activeSection === "contact" ? (
                  <section id="contact" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Contact Information</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {!editMode ? (
                        <>
                          <Field label="Email Address" value={user.email} href={`mailto:${user.email}`} />
                          <Field label="Phone Number" value={user.phone} href={user.phone ? `tel:${user.phone}` : undefined} />
                          <Field label="Country" value={profile?.country} />
                          <Field label="City" value={profile?.city} />
                          <Field label="Address" value={profile?.address} />
                        </>
                      ) : (
                        <>
                          <TextInput label="Email Address" required type="email" value={email} onChange={setEmail} />
                          <TextInput label="Phone Number" required value={phone} onChange={setPhone} placeholder="+251 …" />
                          <TextInput label="Country" value={country} onChange={setCountry} />
                          <TextInput label="City" value={city} onChange={setCity} />
                          <TextInput label="Address" value={address} onChange={setAddress} />
                        </>
                      )}
                    </div>
                  </section>
                ) : activeSection === "account" ? (
                  <section id="account" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Account Information</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {!editMode ? (
                        <>
                          <Field label="Account Status" value={user.accountStatus} />
                          <Field label="Current Access" value={accessStatusLabel} />
                          <Field label="Password" value="Hidden for security" />
                          <Field label="Temporary Password" value={user.mustChangePassword ? "Temporary password active" : "Not active"} />
                          <Field label="Password Status" value={user.passwordStatus ?? "Never reset"} />
                          <Field
                            label="Last Password Reset"
                            value={user.lastPasswordResetAt ? formatDateTime(user.lastPasswordResetAt) : "Never reset"}
                          />
                          <Field
                            label="Last Reset Requested"
                            value={user.lastPasswordResetRequestedAt ? formatDateTime(user.lastPasswordResetRequestedAt) : "Never reset"}
                          />
                          <Field label="Reset Method" value={user.lastPasswordResetMethod ?? "Never reset"} />
                          <Field label="Role Status" value={roleStatusValue} />
                          <Field label="Invite Status" value={inviteStatusValue} />
                          <Field label="Last Login" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never logged in"} />
                          <Field label="Created Date" value={user.createdAt ? formatDateTime(user.createdAt) : ""} />
                          <Field label="Updated Date" value={user.updatedAt ? formatDateTime(user.updatedAt) : ""} />
                        </>
                      ) : (
                        <>
                          <SelectInput
                            label="Account Status"
                            required
                            value={accountStatus}
                            onChange={setAccountStatus}
                            options={[
                              { value: "active", label: "Online" },
                              { value: "invited", label: "Unblocked" },
                              { value: "pending", label: "Blocked" },
                            ]}
                          />
                          <TextInput label="Invite Status" value={inviteStatus} onChange={setInviteStatus} />
                        </>
                      )}
                    </div>
                  </section>
                ) : activeSection === "notes" ? (
                  <section id="notes" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Notes</h2>
                    {!editMode ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {profile?.notes ? profile.notes : "No internal notes added."}
                      </div>
                    ) : (
                      <label className="mt-3 block text-sm">
                        <span className="mb-1.5 block font-medium text-slate-700">Internal note</span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </label>
                    )}
                  </section>
                ) : (
                  <section id="personal" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {!editMode ? (
                        <>
                          <Field label="Full Name" value={displayName} />
                          <Field label="First Name" value={profile?.firstName} />
                          <Field label="Father’s Name" value={profile?.fatherName} />
                          <Field label="Grandfather’s Name" value={profile?.grandfatherName} />
                          <Field label="Gender" value={profile?.gender} />
                          <Field label="Date of Birth" value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : ""} />
                          <Field label="Marital Status" value={profile?.maritalStatus} />
                        </>
                      ) : (
                        <>
                          <TextInput label="First Name" required value={firstName} onChange={setFirstName} />
                          <TextInput label="Father’s Name" required value={fatherName} onChange={setFatherName} />
                          <TextInput label="Grandfather’s Name" value={grandfatherName} onChange={setGrandfatherName} />
                          <SelectInput
                            label="Gender"
                            required
                            value={gender}
                            onChange={setGender}
                            options={[
                              { value: "", label: "Select…" },
                              { value: "male", label: "Male" },
                              { value: "female", label: "Female" },
                              { value: "other", label: "Other" },
                            ]}
                          />
                          <TextInput label="Date of Birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
                          <TextInput label="Marital Status" value={maritalStatus} onChange={setMaritalStatus} />
                        </>
                      )}
                    </div>
                  </section>
                )}

    </AdminDetailLayout>
  );
}
