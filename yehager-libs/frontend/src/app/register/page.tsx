"use client";

import Link from "next/link";
import { useState } from "react";

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current">
      <path d="M4 6h16v12H4z" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" strokeWidth="1.8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current">
      <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="1.8" />
    </svg>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/backend/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(payload?.message ?? payload?.error ?? "Could not create account");
      }

      window.location.href = "/signin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] px-4 py-8 text-[#10182d]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[620px] items-center justify-center">
        <div className="w-full rounded-[22px] bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-10 sm:py-10">
          <div className="mx-auto max-w-[500px]">
            <Link href="/signin" className="inline-flex items-center gap-3 text-base text-[#7184a1] sm:text-lg">
              <span className="text-2xl leading-none">←</span>
              Back to sign in
            </Link>

            <h1 className="mt-5 text-center text-[28px] font-extrabold tracking-[-0.03em] text-[#11182d] sm:text-[34px]">
              Create your account
            </h1>

            <form onSubmit={onSubmit} className="mt-6">
              <label className="block text-center">
                <span className="mb-2 block text-base font-medium text-[#34435c]">Email</span>
                <span className="flex h-14 items-center gap-4 rounded-[16px] border border-[#dce5f0] px-4 text-[#9badc5] sm:h-16">
                  <MailIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-full w-full bg-transparent text-base text-[#34435c] outline-none placeholder:text-[#9badc5] sm:text-lg"
                  />
                </span>
              </label>

              <label className="mt-5 block text-center">
                <span className="mb-2 block text-base font-medium text-[#34435c]">Password</span>
                <span className="flex h-14 items-center gap-4 rounded-[16px] border border-[#dce5f0] px-4 text-[#9badc5] sm:h-16">
                  <LockIcon />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                    className="h-full w-full bg-transparent text-base text-[#34435c] outline-none placeholder:text-[#9badc5] sm:text-lg"
                  />
                </span>
              </label>

              <label className="mt-5 block text-center">
                <span className="mb-2 block text-base font-medium text-[#34435c]">Confirm Password</span>
                <span className="flex h-14 items-center gap-4 rounded-[16px] border border-[#dce5f0] px-4 text-[#9badc5] sm:h-16">
                  <LockIcon />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter password"
                    minLength={8}
                    required
                    className="h-full w-full bg-transparent text-base text-[#34435c] outline-none placeholder:text-[#9badc5] sm:text-lg"
                  />
                </span>
              </label>

              {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 h-14 w-full rounded-[16px] bg-[#10172d] text-lg font-medium text-white disabled:opacity-60 sm:h-16"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
