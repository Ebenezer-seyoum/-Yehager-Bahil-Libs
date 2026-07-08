"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { ArrowLeft, Home, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[#9badc5] flex-shrink-0">
      <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="1.8" />
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

function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;

  const reqs = [
    { label: "At least 8 characters (Min. 8)", valid: password.length >= 8 },
    { label: "At least 1 uppercase letter (/[A-Z]/)", valid: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter (/[a-z]/)", valid: /[a-z]/.test(password) },
    { label: "At least 1 number (/[0-9]/)", valid: /[0-9]/.test(password) },
    { label: "At least 1 special character (/[!@#$%^&*]/)", valid: /[^A-Za-z0-9]/.test(password) }
  ];

  return (
    <ul className="mt-3 flex flex-col gap-1.5 px-1 pb-1">
      {reqs.map((req, i) => (
        <li key={i} className={`flex items-center gap-2 text-[13px] font-semibold ${req.valid ? "text-green-700" : "text-red-800"}`}>
          {req.valid ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
          <span className="leading-tight">{req.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (feedback && feedback.type === "error") {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setPasswordError("");
    setConfirmPasswordError("");
    
    let hasError = false;

    if (!token) {
      setFeedback({ type: "error", message: "Reset link is missing a token. Please request a new password reset email." });
      return;
    }
    
    const isPasswordStrong = 
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!password) {
      setPasswordError("Please insert new password.");
      hasError = true;
    } else if (!isPasswordStrong) {
      setPasswordError("Password does not meet all requirements.");
      hasError = true;
    }
    
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm new password.");
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    }
    
    if (hasError) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/backend/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? payload?.message ?? "Password reset failed.");
      
      setFeedback({ type: "success", message: "Your password was changed successfully. You can sign in with your new password." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Password reset failed." });
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
            Reset password
          </h1>
          <p className="text-[15px] font-medium text-[#64748b] max-w-[320px] mx-auto leading-relaxed">
            Create a new password for your account.
          </p>
        </div>

        <FeedbackBanner feedback={feedback} />

        <form onSubmit={submit} noValidate>
          <div className="mb-5">
            <label className="block text-center mb-1.5 text-[14px] font-semibold text-[#1e293b]">New password</label>
            <div className={`flex items-center gap-3 rounded-xl border ${passwordError ? "border-red-400" : "border-[#cbd5e1]"} bg-white px-4 py-3.5 focus-within:border-[#94a3b8]`}>
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }}
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#94a3b8] hover:text-[#64748b] focus:outline-none px-1 flex-shrink-0"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-[13px] font-medium text-red-700 text-center">{passwordError}</p>}
            <PasswordRequirements password={password} />
          </div>

          <div className="mb-8">
            <label className="block text-center mb-1.5 text-[14px] font-semibold text-[#1e293b]">Confirm new password</label>
            <div className={`flex items-center gap-3 rounded-xl border ${confirmPasswordError ? "border-red-400" : "border-[#cbd5e1]"} bg-white px-4 py-3.5 focus-within:border-[#94a3b8]`}>
              <LockIcon />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setConfirmPasswordError(""); }}
                placeholder="••••••••"
                required
                className="w-full bg-transparent text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[#94a3b8] hover:text-[#64748b] focus:outline-none px-1 flex-shrink-0"
              >
                {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {confirmPasswordError && <p className="mt-1.5 text-[13px] font-medium text-red-700 text-center">{confirmPasswordError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0f172a] py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60"
          >
            {submitting ? "Changing password..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
