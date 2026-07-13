"use client";

import Link from "next/link";
import { Home, Eye, EyeOff } from "lucide-react";
import { getProviders, getSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getPostLoginRedirect } from "@/lib/auth-redirect";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

const authErrorMessages: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled or denied.",
  CredentialsSignin: "Invalid email or password.",
  AccountBlocked: "Please contact admin. Account has been deactivated.",
  OAuthAccountNotLinked: "Please sign in with the same method you used before.",
  OAuthCallback: "Google sign-in could not be completed. Please try again.",
  OAuthSignin: "Google sign-in could not be started. Please try again.",
};

function getAuthErrorMessage(error: string | null) {
  if (!error) return null;
  return authErrorMessages[error] ?? "Sign-in failed. Please try again.";
}

function getSafeCallbackUrl(value: string | null) {
  if (!value || value === "/signin" || value.startsWith("/signin?")) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function getOAuthCallbackUrl(callbackUrl?: string) {
  const params = new URLSearchParams();
  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }
  const query = params.toString();
  return `/auth/redirect${query ? `?${query}` : ""}`;
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.607 4.607 0 0 1-1.995 3.023v2.51h3.232c1.891-1.742 2.981-4.31 2.981-7.356Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.619-2.418l-3.232-2.51c-.896.6-2.042.955-3.387.955-2.595 0-4.79-1.754-5.576-4.113H3.083v2.586A9.999 9.999 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.424 13.914A5.996 5.996 0 0 1 6.091 12c0-.664.118-1.309.333-1.914V7.5H3.083A9.996 9.996 0 0 0 2 12c0 1.613.386 3.14 1.083 4.5l3.341-2.586Z" />
      <path fill="#EA4335" d="M12 5.973c1.468 0 2.786.505 3.823 1.495l2.868-2.868C16.959 2.986 14.7 2 12 2a9.999 9.999 0 0 0-8.917 5.5l3.341 2.586C7.21 7.727 9.405 5.973 12 5.973Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[#9badc5] flex-shrink-0">
      <path d="M4 6h16v12H4z" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" strokeWidth="1.8" />
    </svg>
  );
}

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
      className={`rounded-xl px-4 py-3 text-center text-sm font-semibold mb-6 ${
        feedback.type === "success"
          ? "bg-green-100 text-green-900 border border-green-300"
          : "bg-red-100 text-red-900 border border-red-300"
      }`}
    >
      {feedback.message}
    </div>
  );
}

function SignInForm() {
  const searchParams = useSearchParams()!;
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const initialFeedback = (() => {
    if (searchParams.get("registered") === "1") {
      return {
        type: "success" as const,
        message: "Account created successfully. Sign in to continue.",
      };
    }

    const authError = getAuthErrorMessage(searchParams.get("error"));
    return authError
      ? {
          type: "error" as const,
          message: authError,
        }
      : null;
  })();
  
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProviders() {
      const providers = await getProviders();
      if (mounted) {
        setGoogleAvailable(Boolean(providers?.google));
      }
    }
    void loadProviders();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function redirectExistingSession() {
      const session = await getSession();
      if (!mounted || !session?.user?.id) return;

      const accountStatus = String(session.user.accountStatus ?? "active").toLowerCase();
      if (accountStatus === "inactive" || accountStatus === "blocked" || accountStatus === "pending") {
        await signOut({ redirect: false });
        if (mounted) {
          setFeedback({
            type: "error",
            message: "Please contact admin. Account has been deactivated.",
          });
        }
        return;
      }

      const redirectTo = session.user.mustChangePassword
        ? "/change-password-required"
        : session.user.role === "employee" &&
            (session.user.roleStatus === "unassigned" ||
              session.user.assignedRoleActive === false ||
              (session.user.permissions ?? []).length === 0)
          ? "/employee/access-pending"
          : getPostLoginRedirect(session.user.role, callbackUrl, session.user.permissions ?? []);

      window.location.href = redirectTo;
    }
    void redirectExistingSession();
    return () => {
      mounted = false;
    };
  }, [callbackUrl]);

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
    setPasswordError("");
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Please insert email.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Please insert password.");
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: callbackUrl ?? "/my-account",
        redirect: false,
      });

      if (!result || result.error) {
        setFeedback({
          type: "error",
          message: getAuthErrorMessage(result?.error ?? "CredentialsSignin") ?? "Invalid email or password.",
        });
        setSubmitting(false);
        return;
      }

      setFeedback({
        type: "success",
        message: "Signed in successfully. Redirecting...",
      });

      const session = await getSession();
      const accountStatus = String(session?.user?.accountStatus ?? "active").toLowerCase();
      if (accountStatus === "inactive" || accountStatus === "blocked" || accountStatus === "pending") {
        await signOut({ redirect: false });
        setFeedback({
          type: "error",
          message: "Please contact admin. Account has been deactivated.",
        });
        setSubmitting(false);
        return;
      }

      window.setTimeout(() => {
        const redirectTo = session?.user?.mustChangePassword
          ? "/change-password-required"
          : session?.user?.role === "employee" &&
              (session.user.roleStatus === "unassigned" ||
                session.user.assignedRoleActive === false ||
                (session.user.permissions ?? []).length === 0)
            ? "/employee/access-pending"
            : getPostLoginRedirect(session?.user?.role, callbackUrl, session?.user?.permissions ?? []);
        window.location.href = redirectTo;
      }, 650);
    } catch {
      setFeedback({
        type: "error",
        message: "Sign-in failed. Please try again.",
      });
      setSubmitting(false);
    }
  }

  async function onGoogleSignIn() {
    setFeedback(null);
    if (googleAvailable === false) {
      setFeedback({
        type: "error",
        message: "Google sign-in is not configured yet.",
      });
      return;
    }
    setGoogleSubmitting(true);
    await signIn("google", { callbackUrl: getOAuthCallbackUrl(callbackUrl) });
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
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-100 shadow-sm flex items-center justify-center bg-white">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="h-full w-full object-cover scale-[1.2]"
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-[26px] font-bold leading-tight text-[#0f172a] mb-2">
            Welcome to Yehager Bahil<br />Libs
          </h1>
          <p className="text-[15px] font-medium text-[#64748b]">Sign in to continue</p>
        </div>

        <FeedbackBanner feedback={feedback} />

        <button
          type="button"
          onClick={() => void onGoogleSignIn()}
          disabled={googleSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#cbd5e1] bg-white py-3.5 text-[15px] font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-60"
        >
          <GoogleMark />
          {googleSubmitting ? "Opening Google..." : "Continue with Google"}
        </button>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-[#e2e8f0]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">OR</span>
          <span className="h-px flex-1 bg-[#e2e8f0]" />
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-5">
            <label className="block text-center mb-1.5 text-[14px] font-semibold text-[#1e293b]">Email</label>
            <div className={`flex items-center gap-3 rounded-xl border ${emailError ? "border-red-400" : "border-[#cbd5e1]"} bg-white px-4 py-3.5 focus-within:border-[#94a3b8]`}>
              <MailIcon />
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                placeholder="you@example.com"
                required
                className="w-full bg-transparent text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
            {emailError && <p className="mt-1.5 text-[13px] font-medium text-red-700 text-center">{emailError}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-center mb-1.5 text-[14px] font-semibold text-[#1e293b]">Password</label>
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
                className="text-[#9badc5] hover:text-[#64748b] transition flex-shrink-0"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-[13px] font-medium text-red-700 text-center">{passwordError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0f172a] py-3.5 text-[16px] font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-[14px] font-medium text-[#64748b]">
          <Link href="/forgot-password" className="hover:text-[#0f172a] transition-colors">Forgot password?</Link>
          <span>
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-[#0f172a] hover:underline">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <SignInForm />
    </Suspense>
  );
}
