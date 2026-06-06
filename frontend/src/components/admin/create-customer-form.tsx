"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createCustomerAction } from "@/lib/admin/actions/user-actions";
import { useFormStatus } from "react-dom";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 hover:bg-blue-950 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Creating…" : "+ Add customer"}
    </button>
  );
}

/** Compact customer registration — simpler than employee form */
export function CreateCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);

  const errorMessage = useMemo(() => {
    if (error === "validation") return "Please fill in all required fields.";
    if (error === "create") return "Could not create customer. Check the email is unique and try again.";
    return null;
  }, [error]);

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-white to-blue-50 px-5 py-5 sm:px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/10 text-2xl">👤</div>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">Register New Customer</h2>
        <p className="mt-1 text-sm text-slate-600">
          Quick account setup for storefront access and order tracking.
        </p>
      </div>

      {errorMessage ? (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6">
          {errorMessage}
        </div>
      ) : null}

      <form action={createCustomerAction} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Full name *</span>
            <input
              name="name"
              required
              className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Email *</span>
            <input
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Phone</span>
            <input
              name="phone"
              type="tel"
              placeholder="+251 …"
              className="h-11 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Password *</span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                required
                className="h-11 w-full rounded-xl border border-blue-100 px-3 pr-11 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-blue-100 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => router.replace("/admin/customers?tab=all")}
            className="rounded-xl border border-blue-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50"
          >
            Back to customers
          </button>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
