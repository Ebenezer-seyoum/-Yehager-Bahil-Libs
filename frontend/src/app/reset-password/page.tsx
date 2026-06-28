"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lock, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (!token) {
      setStatus({ type: "error", message: "Reset link is missing a token. Please request a new password reset email." });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/backend/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? payload?.message ?? "Password reset failed.");
      setStatus({ type: "success", message: "Your password was changed successfully. You can sign in with your new password." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Password reset failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <form onSubmit={submit} className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Create a new password for your account.</p>
          </div>
        </div>

        {status ? (
          <div className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {status.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{status.message}</span>
          </div>
        ) : null}

        <label className="block text-sm font-semibold">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            minLength={8}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={submitting} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {submitting ? "Changing password..." : "Change password"}
        </button>
        <Link href="/signin" className="mt-4 block text-center text-sm font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
