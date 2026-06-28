"use client";

import { Check, Globe, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/I18nContext";

const HINT_KEY = "ybl_lang_hint_dismissed";

export function LanguageSwitcher({ compact = false, navbar = false }: { compact?: boolean; navbar?: boolean }) {
  const { language, setLanguage } = useT();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.localStorage.getItem(HINT_KEY);
  });
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const currentLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];
  const filteredLanguages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return LANGUAGES;
    return LANGUAGES.filter((item) => {
      return [item.code, item.name, item.nativeName].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [query]);
  const priorityLanguages = filteredLanguages.filter((item) => item.priority);
  const localLanguages = filteredLanguages.filter((item) => item.group === "local" && !item.priority);
  const internationalLanguages = filteredLanguages.filter((item) => item.group === "international" && !item.priority);

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
    setQuery("");
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
          if (open) setQuery("");
        }}
        className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
          navbar ? "xl:h-11 xl:w-[124px] xl:justify-between xl:rounded-lg xl:border xl:border-primary xl:bg-[#2a2014] xl:px-2 xl:text-xs xl:text-primary" : ""
        } ${showHint ? "bg-primary/15 text-primary ring-1 ring-primary/40" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Globe className="h-4 w-4 shrink-0" />
          {!compact ? <span className="hidden truncate font-medium sm:inline">{currentLanguage.nativeName}</span> : null}
          <span className="text-xs font-bold uppercase sm:hidden">{currentLanguage.code}</span>
        </span>
        {navbar ? (
          <span
            aria-hidden="true"
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-center text-[6px] font-black uppercase leading-[1.12] text-primary-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.35)] xl:flex ${
              showHint ? "ring-1 ring-primary-foreground/70" : ""
            }`}
          >
            LANG
            <br />
            LOCAL/
            <br />
            INTL
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border p-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search language..."
                className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
          <div className="max-h-[440px] overflow-y-auto p-2">
            {priorityLanguages.length ? (
              <>
                <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">Fast access</p>
                {priorityLanguages.map((item) => (
                  <LanguageOption key={item.code} item={item} active={language === item.code} onSelect={() => chooseLanguage(item.code)} />
                ))}
              </>
            ) : null}
            {localLanguages.length ? (
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">Local languages</p>
            ) : null}
            {localLanguages.map((item) => (
              <LanguageOption key={item.code} item={item} active={language === item.code} onSelect={() => chooseLanguage(item.code)} />
            ))}
            {internationalLanguages.length ? (
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">International</p>
            ) : null}
            {internationalLanguages.map((item) => (
              <LanguageOption key={item.code} item={item} active={language === item.code} onSelect={() => chooseLanguage(item.code)} />
            ))}
            {!filteredLanguages.length ? (
              <p className="px-2 py-8 text-center text-sm font-semibold text-muted-foreground">No language found.</p>
            ) : null}
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
