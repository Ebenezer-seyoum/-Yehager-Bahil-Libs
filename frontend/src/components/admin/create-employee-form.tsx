"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Eye, EyeOff, Loader2, Shield, UserRound } from "lucide-react";
import { createEmployeeAction } from "@/lib/admin/actions/user-actions";
import { useFormStatus } from "react-dom";
import { filterAssignableEmployeeRoles } from "@/lib/admin/assignable-roles";

type Role = { id: string; name: string; key?: string | null; isSystem?: boolean | null };

const STATUS_OPTIONS = ["active", "inactive"] as const;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Creating employee…" : "+ Add employee"}
    </button>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3 border-b border-blue-50 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Full employee registration — not the same layout as customer create */
export function CreateEmployeeForm({
  roles,
  canCreate = true,
}: {
  roles: Role[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const assignableRoles = useMemo(() => filterAssignableEmployeeRoles(roles), [roles]);

  const errorMessage = useMemo(() => {
    if (error === "validation") return "Please fill in all required fields.";
    if (error === "create") return "Could not create employee. Check the email is unique and try again.";
    return null;
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 px-5 py-6 text-white shadow-lg sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Users</p>
        <h2 className="mt-1 font-heading text-2xl font-semibold">Register New Employee</h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Create a staff account with role-based access. This is separate from customer registration.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form action={createEmployeeAction} className="space-y-4">
        <FormSection
          title="Personal Information"
          description="Name and login credentials for the employee account."
          icon={UserRound}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Full name *</span>
              <input
                name="name"
                required
                disabled={!canCreate}
                className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Email address *</span>
              <input
                name="email"
                type="email"
                required
                disabled={!canCreate}
                className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Phone number</span>
              <input
                name="phone"
                type="tel"
                disabled={!canCreate}
                placeholder="+251 …"
                className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Initial password *</span>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}"
                  title="Use at least 8 characters with uppercase, lowercase, number, and special character."
                  required
                  disabled={!canCreate}
                  className="h-11 w-full rounded-xl border border-blue-100 px-3 pr-11 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="mt-1 block text-xs text-slate-500">8+ characters with uppercase, lowercase, number, and special character</span>
            </label>
          </div>
        </FormSection>

        <FormSection title="Notes" description="Internal note for admins (optional)." icon={Briefcase}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Notes</span>
              <textarea
                name="notes"
                rows={3}
                disabled={!canCreate}
                className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          title="Role & Account Status"
          description="Assign permissions and set whether the account is active."
          icon={Shield}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Role / user type</span>
              <select
                name="roleId"
                disabled={!canCreate}
                className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              >
                <option value="">Default employee</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Account status *</span>
              <select
                name="status"
                defaultValue="active"
                disabled={!canCreate}
                className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.replace("/admin/users?tab=all")}
            className="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50"
          >
            Back to employees
          </button>
          <SubmitButton disabled={!canCreate} />
        </div>
      </form>
    </div>
  );
}
