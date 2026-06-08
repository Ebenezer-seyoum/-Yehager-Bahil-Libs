"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { useState, useEffect } from "react";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[#9badc5]">
      <path d="M4 6h16v12H4z" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" strokeWidth="1.8" />
    </svg>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <div
      aria-live="polite"
      className={`rounded-xl px-4 py-3 text-center text-sm font-semibold mb-6 mx-auto w-full ${
        feedback.type === "success"
          ? "bg-green-100 text-green-900 border border-green-300"
          : "bg-red-100 text-red-900 border border-red-300"
      }`}
    >
      {feedback.message}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Please insert email.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/backend/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error ?? payload?.message ?? "Unable to send reset link."));
      }

      setFeedback({
        type: "success",
        message: "If an account exists for this email, a reset link has been sent.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to send reset link.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-12 relative flex items-center justify-center font-sans">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] shadow-sm transition hover:bg-[#f1f5f9]"
      >
        <Home className="h-4 w-4" />
        Back to home
      </Link>
      
      <div className="w-full max-w-[480px] bg-white rounded-[24px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-12">
        <Link href="/signin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748b] transition hover:text-[#0f172a] mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-[26px] font-bold leading-tight text-[#0f172a] mb-3">
            Reset your password
          </h1>
          <p className="text-[15px] font-medium text-[#64748b] max-w-[320px] mx-auto leading-relaxed">
            Enter your email and we&apos;ll send you a link to reset your password
          </p>
        </div>

        <FeedbackBanner feedback={feedback} />

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-6">
            <label className="block text-center mb-1.5 text-[14px] font-semibold text-[#1e293b]">Email</label>
            <div className={`flex items-center gap-3 rounded-xl border ${emailError ? "border-red-400" : "border-[#cbd5e1]"} bg-white px-4 py-3.5 focus-within:border-[#94a3b8]`}>
              <MailIcon />
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                placeholder="you@example.com"
                disabled={submitting}
                className="w-full bg-transparent text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
            {emailError && <p className="mt-1.5 text-[13px] font-medium text-red-700 text-center">{emailError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0f172a] py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
