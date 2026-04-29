import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";

const HINT_KEY = "ybl_lang_hint_dismissed";

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, currentLang, languages, t } = useT();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const ref = useRef(null);

  // Show blinking hint until the user has opened the switcher at least once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(HINT_KEY);
    if (!dismissed) setShowHint(true);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismissHint = () => {
    if (showHint) {
      setShowHint(false);
      try { localStorage.setItem(HINT_KEY, "1"); } catch {}
    }
  };

  const localLangs = languages.filter((l) => l.group === "local");
  const intlLangs = languages.filter((l) => l.group === "international");

  return (
    <div ref={ref} className="relative">
      {/* Blinking attention ring */}
      {showHint && !open && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary animate-ping opacity-75" />
          <span className="pointer-events-none absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(251,163,20,0.9)]" />
        </>
      )}

      <button
        onClick={() => { setOpen((o) => !o); dismissHint(); }}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          showHint
            ? "bg-primary/15 text-primary hover:bg-primary/25 ring-1 ring-primary/40"
            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Select language"
        title={showHint ? "Available in Amharic, Oromo, Tigrigna and more" : "Select language"}
      >
        <Globe className={`w-4 h-4 ${showHint ? "animate-pulse" : ""}`} />
        {!compact && <span className="hidden sm:inline font-medium">{currentLang.nativeName}</span>}
        <span className="sm:hidden uppercase text-xs font-bold">{language}</span>
        {showHint && (
          <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 ml-0.5">
            🇪🇹 ኣማ/Oro/ትግ
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Local languages — DEFAULT FIRST */}
          <div className="p-2">
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold px-2 py-1.5">
              {t("lang.localLanguages")}
            </p>
            {localLangs.map((lang) => (
              <LangButton key={lang.code} lang={lang} active={language === lang.code} onSelect={() => { setLanguage(lang.code); setOpen(false); dismissHint(); }} />
            ))}
          </div>

          <div className="border-t border-border" />

          {/* International */}
          <div className="p-2 max-h-72 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2 py-1.5">
              {t("lang.international")}
            </p>
            {intlLangs.map((lang) => (
              <LangButton key={lang.code} lang={lang} active={language === lang.code} onSelect={() => { setLanguage(lang.code); setOpen(false); dismissHint(); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LangButton({ lang, active, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-primary/15 text-primary" : "hover:bg-secondary text-foreground"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-base">{lang.flag}</span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium">{lang.nativeName}</span>
          <span className="text-[10px] text-muted-foreground">{lang.name}</span>
        </span>
      </span>
      {active && <Check className="w-4 h-4 text-primary" />}
    </button>
  );
}