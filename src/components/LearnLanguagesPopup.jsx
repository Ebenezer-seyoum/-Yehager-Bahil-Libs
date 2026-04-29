import { useEffect } from "react";
import { X, GraduationCap, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";

const LEARN_URL = "https://learnethiopianlanguages.online/";

export default function LearnLanguagesPopup({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleRegister = () => {
    window.open(LEARN_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[92vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ─── PAYMENT CONFIRMED BANNER (top — different color, celebratory) ─── */}
        <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 p-5 sm:p-6 rounded-t-2xl text-white text-center">
          <div className="text-4xl mb-1" aria-hidden="true">🌸</div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-widest font-semibold">Payment Confirmed</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-1">Congratulations — Your Payment Was Successful!</h2>
          <p className="text-sm text-white/90 leading-relaxed">
            Your order is securely placed. A confirmation email is on its way.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* ─── LANGUAGE SCHOOL HEADLINE OFFER (prominent, separate box) ─── */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/10 p-5 sm:p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] uppercase tracking-widest font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> A Special Offer For You
            </div>
            <p className="text-sm text-muted-foreground mb-2">Thank you for making your payment.</p>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              Would you like to <span className="text-amber-400">learn</span> — or <span className="text-amber-400">teach your kids</span> —{" "}
              <span className="whitespace-nowrap">Amharic, Afan Oromo</span> or <span className="whitespace-nowrap">Tigrigna?</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              From our sister company{" "}
              <span className="font-semibold text-foreground underline">learnethiopianlanguages.online</span>
            </p>
          </div>

          {/* Who this is for */}
          <div>
            <h3 className="font-heading text-lg font-bold mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-500" /> Who This Is For
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Second-generation diaspora children who want to connect naturally with their roots",
                "Travelers who want richer, more meaningful experiences",
                "Expats and international professionals seeking confidence in communication",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Languages */}
          <div>
            <h3 className="font-heading text-lg font-bold mb-3">Languages Offered</h3>
            <div className="flex flex-wrap gap-2">
              {["Amharic", "Afan Oromo", "Tigrigna", "English"].map((lang) => (
                <span key={lang} className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium border border-amber-500/30">
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* What makes it different */}
          <div>
            <h3 className="font-heading text-lg font-bold mb-3">What Makes This Program Different</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Live and interactive sessions with real instructors focused on practical communication",
                "Personal learning dashboard to track activities, homework, and progress",
                "University-level instructors with proven teaching experience",
                "Flexible scheduling designed to fit your lifestyle",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold italic text-foreground">Designed for results. Built for real life.</p>
          </div>

          {/* Invitation */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">Begin Your Journey</p>
            <p className="text-sm text-foreground">
              Take the next step in connecting with your heritage — register today and start learning at your own pace.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRegister}
              className="flex-1 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-amber-600/30"
            >
              Yes, I would like to register
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-sm transition-colors"
            >
              No, I will continue for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}