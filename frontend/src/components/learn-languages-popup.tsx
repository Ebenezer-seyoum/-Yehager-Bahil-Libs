"use client";

import { useEffect } from "react";
import { CheckCircle2, GraduationCap, ShieldCheck, Sparkles, X } from "lucide-react";
import { LEARN_LANGUAGES_URL } from "@/lib/taxonomy";

export function LearnLanguagesPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleRegister() {
    window.open(LEARN_LANGUAGES_URL, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative my-8 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="rounded-t-2xl bg-gradient-to-br from-green-600 via-green-700 to-green-800 p-5 text-center text-white sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">Payment Confirmed</span>
          </div>
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Congratulations, Your Payment Was Successful!</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/90">Your order is securely placed. A confirmation email is on its way.</p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/10 p-5 text-center sm:p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> A Special Offer For You
            </div>
            <p className="mb-2 text-sm text-muted-foreground">Thank you for making your payment.</p>
            <h3 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Would you like to <span className="text-amber-400">learn</span> or <span className="text-amber-400">teach your kids</span> Amharic, Afan Oromo or Tigrigna?
            </h3>
            <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
              From our sister company <span className="font-semibold text-foreground underline">learnethiopianlanguages.online</span>
            </p>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold">
              <GraduationCap className="h-4 w-4 text-amber-500" /> Who This Is For
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Second-generation diaspora children who want to connect naturally with their roots",
                "Travelers who want richer, more meaningful experiences",
                "Expats and international professionals seeking confidence in communication",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-lg font-bold">Languages Offered</h3>
            <div className="flex flex-wrap gap-2">
              {["Amharic", "Afan Oromo", "Tigrigna", "English"].map((language) => (
                <span key={language} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400">
                  {language}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={handleRegister}
              className="flex-1 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 transition-colors hover:bg-amber-700"
            >
              Yes, I would like to register
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80">
              No, I will continue for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
