"use client";

import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/I18nContext";

const HINT_KEY = "ybl_lang_hint_dismissed";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useT();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const currentLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];
  const localLanguages = LANGUAGES.filter((item) => item.group === "local");
  const internationalLanguages = LANGUAGES.filter((item) => item.group === "international");

  useEffect(() => {
    if (!window.localStorage.getItem(HINT_KEY)) {
      setShowHint(true);
    }
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
    window.localStorage.setItem(HINT_KEY, "1");
  }

  function chooseLanguage(code: string) {
    setLanguage(code);
    dismissHint();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {showHint && !open ? (
        <>
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-lg ring-2 ring-primary opacity-70" />
          <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        </>
      ) : null}
      <button
        type="button"
        aria-label="Select language"
        onClick={() => {
          setOpen((value) => !value);
          dismissHint();
        }}
        className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
          showHint ? "bg-primary/15 text-primary ring-1 ring-primary/40" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Globe className="h-4 w-4" />
        {!compact ? <span className="hidden font-medium sm:inline">{currentLanguage.nativeName}</span> : null}
        <span className="text-xs font-bold uppercase sm:hidden">{language}</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="p-2">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">Local languages</p>
            {localLanguages.map((item) => (
              <LanguageOption key={item.code} item={item} active={language === item.code} onSelect={() => chooseLanguage(item.code)} />
            ))}
          </div>
          <div className="border-t border-border" />
          <div className="p-2">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">International</p>
            {internationalLanguages.map((item) => (
              <LanguageOption key={item.code} item={item} active={language === item.code} onSelect={() => chooseLanguage(item.code)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LanguageOption({
  item,
  active,
  onSelect,
}: {
  item: (typeof LANGUAGES)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-secondary"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-base">{item.flag}</span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium">{item.nativeName}</span>
          <span className="text-[10px] text-muted-foreground">{item.name}</span>
        </span>
      </span>
      {active ? <Check className="h-4 w-4 text-primary" /> : null}
    </button>
  );
}
