"use client";

import { FormEvent, useMemo, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getPostLoginRedirect } from "@/lib/auth-redirect";

type Profile = {
  name?: string | null;
  role?: string | null;
  permissions?: string[] | null;
};

export default function ChangePasswordRequiredPage() {
  const router = useRouter();
  const { user, checkAppState, logout } = useAuth();
  const profile = (user ?? {}) as Profile;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      match: newPassword.length > 0 && newPassword === confirmPassword,
    }),
    [confirmPassword, newPassword],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!passwordChecks.length) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!passwordChecks.match) {
      setError("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/backend/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Password change failed.");
      }

      setMessage("Password changed successfully. Redirecting...");
      await checkAppState();
      const redirectTo = profile.role === "customer"
        ? "/my-account"
        : getPostLoginRedirect(profile.role, undefined, profile.permissions ?? []);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-950 px-4 py-12 text-white">
      <section className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-[#17120a] p-6 shadow-2xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/10">
            <LockKeyhole className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Security Required</p>
            <h1 className="mt-1 text-2xl font-black">Create your permanent password</h1>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Hello {profile.name ?? "there"}, your account was created with a temporary password. Change it before using your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-200">Current temporary password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none ring-amber-300/40 focus:ring-4"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-200">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none ring-amber-300/40 focus:ring-4"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-200">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none ring-amber-300/40 focus:ring-4"
            />
          </label>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
            <p className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${passwordChecks.length ? "text-emerald-300" : "text-slate-500"}`} />
              At least 8 characters
            </p>
            <p className="mt-1 flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${passwordChecks.match ? "text-emerald-300" : "text-slate-500"}`} />
              Password confirmation matches
            </p>
          </div>

          {error ? <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-amber-500 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Changing password..." : "Change Password"}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full text-center text-sm font-bold text-slate-400 underline-offset-4 hover:text-white hover:underline"
        >
          Sign out instead
        </button>
      </section>
    </main>
  );
}
