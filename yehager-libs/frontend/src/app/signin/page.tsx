"use client";

import Link from "next/link";
import { Home } from "lucide-react";
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
  AccountBlocked: "Your account has been blocked. Please contact your administrator for assistance.",
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

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.607 4.607 0 0 1-1.995 3.023v2.51h3.232c1.891-1.742 2.981-4.31 2.981-7.356Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.619-2.418l-3.232-2.51c-.896.6-2.042.955-3.387.955-2.595 0-4.79-1.754-5.576-4.113H3.083v2.586A9.999 9.999 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.424 13.914A5.996 5.996 0 0 1 6.091 12c0-.664.118-1.309.333-1.914V7.5H3.083A9.996 9.996 0 0 0 2 12c0 1.613.386 3.14 1.083 4.5l3.341-2.586Z" />
      <path fill="#EA4335" d="M12 5.973c1.468 0 2.786.505 3.823 1.495l2.868-2.868C16.959 2.986 14.7 2 12 2a9.999 9.999 0 0 0-8.917 5.5l3.341 2.586C7.21 7.727 9.405 5.973 12 5.973Z" />
    </svg>
  );
}

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

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <div
      aria-live="polite"
      className={`mt-6 rounded-[16px] border px-4 py-3 text-center text-sm font-medium ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {feedback.message}
    </div>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!email.trim()) {
      setFeedback({
        type: "error",
        message: "Please insert email.",
      });
      return;
    }

    if (!password) {
      setFeedback({
        type: "error",
        message: "Please insert password.",
      });
      return;
    }

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
      const accountStatus = String((session?.user as any)?.accountStatus ?? "active").toLowerCase();
      if (accountStatus === "inactive" || accountStatus === "blocked" || accountStatus === "pending") {
        await signOut({ redirect: false });
        setFeedback({
          type: "error",
          message: "Your account has been blocked. Please contact your administrator for assistance.",
        });
        setSubmitting(false);
        return;
      }

      window.setTimeout(() => {
        window.location.href = getPostLoginRedirect(session?.user?.role, callbackUrl);
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
    await signIn("google", { callbackUrl: callbackUrl ?? "/my-account" });
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] px-4 py-8 text-[#10182d]">
      <Link
        href="/"
        className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-[#dce5f0] bg-white px-4 py-2 text-sm font-semibold text-[#34435c] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:bg-[#f8fbff]"
      >
        <Home className="h-4 w-4" />
        Back to home
      </Link>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[540px] items-center justify-center">
        <div className="relative flex min-h-[650px] w-full flex-col justify-center rounded-[22px] bg-white px-6 pb-8 pt-20 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:min-h-[670px] sm:px-8 sm:pb-9 sm:pt-24">
          <div className="absolute left-1/2 top-0 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="h-full w-full scale-[1.55] object-cover"
            />
          </div>

          <div className="mx-auto w-full max-w-[440px]">
            <div className="text-center">
              <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#11182d] sm:text-[36px]">
                Welcome to Yehager
                <br />
                Bahil Libs
              </h1>
              <p className="mt-4 text-[17px] tracking-[0.03em] text-[#6b7e9d] sm:text-[19px]">Sign in to continue</p>
            </div>

            <button
              type="button"
              onClick={() => void onGoogleSignIn()}
              disabled={googleSubmitting}
              className="mt-8 flex h-14 w-full items-center justify-center gap-4 rounded-[16px] border border-[#dce5f0] bg-white text-[17px] font-medium text-[#34435c] transition hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[19px]"
            >
              <GoogleMark />
              {googleSubmitting ? "Opening Google..." : "Continue with Google"}
            </button>

            <div className="mt-8 flex items-center gap-5 text-sm uppercase tracking-[0.08em] text-[#8ca0bd]">
              <span className="h-px flex-1 bg-[#dce5f0]" />
              OR
              <span className="h-px flex-1 bg-[#dce5f0]" />
            </div>

            <form onSubmit={onSubmit} noValidate className="mt-8">
              <label className="block text-center">
                <span className="mb-3 block text-base font-medium text-[#34435c]">Email</span>
                <span className="flex h-14 items-center gap-4 rounded-[16px] border border-[#dce5f0] px-4 text-[#9badc5]">
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

              <label className="mt-6 block text-center">
                <span className="mb-3 block text-base font-medium text-[#34435c]">Password</span>
                <span className="flex h-14 items-center gap-4 rounded-[16px] border border-[#dce5f0] px-4 text-[#9badc5]">
                  <LockIcon />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-full w-full bg-transparent text-base text-[#34435c] outline-none placeholder:text-[#9badc5] sm:text-lg"
                  />
                </span>
              </label>

              <FeedbackBanner feedback={feedback} />

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 h-14 w-full rounded-[16px] bg-[#10172d] text-lg font-medium text-white transition hover:bg-[#18213b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[#7184a1] sm:text-base">
              <Link href="/forgot-password">Forgot password?</Link>
              <span>
                Need an account?{" "}
                <Link href="/register" className="font-medium text-[#34435c]">
                  Sign up
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f9fc]" />}>
      <SignInForm />
    </Suspense>
  );
}
