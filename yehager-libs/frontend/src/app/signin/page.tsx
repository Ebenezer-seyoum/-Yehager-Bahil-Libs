"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getPostLoginRedirect } from "@/lib/auth-redirect";

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

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Invalid credentials");
      setSubmitting(false);
      return;
    }

    const session = await getSession();
    window.location.href = getPostLoginRedirect(session?.user?.role, callbackUrl);
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] px-4 py-8 text-[#10182d]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[620px] items-center justify-center">
        <div className="relative w-full rounded-[22px] bg-white px-6 pb-8 pt-20 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-10 sm:pb-10 sm:pt-24">
          <img
            src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
            alt="Yehager Bahil Libs"
            className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-white object-cover shadow-[0_8px_20px_rgba(15,23,42,0.08)] sm:h-24 sm:w-24"
          />

          <div className="mx-auto max-w-[500px]">
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
              className="mt-8 flex h-14 w-full items-center justify-center gap-4 rounded-[16px] border border-[#dce5f0] bg-white text-[17px] font-medium text-[#34435c] sm:h-16 sm:text-[19px]"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <div className="mt-7 flex items-center gap-5 text-sm uppercase tracking-[0.08em] text-[#8ca0bd]">
              <span className="h-px flex-1 bg-[#dce5f0]" />
              or
              <span className="h-px flex-1 bg-[#dce5f0]" />
            </div>

            <form onSubmit={onSubmit} className="mt-7">
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
                    placeholder="••••••••"
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
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#7184a1] sm:text-base">
              <button type="button">Forgot password?</button>
              <span>
                Need an account?{" "}
                <Link href="/register" className="text-[#34435c]">
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
