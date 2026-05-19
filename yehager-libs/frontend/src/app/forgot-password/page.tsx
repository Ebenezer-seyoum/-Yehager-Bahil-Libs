"use client";

import Link from "next/link";
import { useState } from "react";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current">
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
      className={`mt-5 rounded-[16px] border px-4 py-3 text-center text-sm font-medium ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {feedback.message}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!email.trim()) {
      setFeedback({
        type: "error",
        message: "Please insert email.",
      });
      return;
    }

    setFeedback({
      type: "error",
      message: "Password reset email is not configured yet.",
    });
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] px-4 py-8 text-[#10182d]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[540px] items-center justify-center">
        <div className="flex min-h-[420px] w-full flex-col justify-center rounded-[22px] bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-[440px]">
            <Link href="/signin" className="inline-flex items-center gap-3 text-base text-[#7184a1] sm:text-lg">
              <span className="text-2xl leading-none">←</span>
              Back to sign in
            </Link>

            <div className="mt-6 text-center">
              <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#11182d]">
                Reset your password
              </h1>
              <p className="mx-auto mt-4 max-w-[360px] text-[17px] leading-8 text-[#526682]">
                Enter your email and we&apos;ll send you a link to reset your password
              </p>
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
                    className="h-full w-full bg-transparent text-base text-[#34435c] outline-none placeholder:text-[#9badc5] sm:text-lg"
                  />
                </span>
              </label>

              <FeedbackBanner feedback={feedback} />

              <button
                type="submit"
                className="mt-6 h-14 w-full rounded-[16px] bg-[#10172d] text-lg font-medium text-white transition hover:bg-[#18213b]"
              >
                Send reset link
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
