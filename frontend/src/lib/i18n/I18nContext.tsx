"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/i18n/languages";
import { TRANSLATIONS } from "@/lib/i18n/translations";

const STORAGE_KEY = "ybl_language";

type I18nContextValue = {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LANGUAGE;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((code: string) => {
    if (!TRANSLATIONS[code]) return;
    setLanguageState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    const langDef = LANGUAGES.find((lang) => lang.code === language);
    document.documentElement.dir = langDef?.rtl ? "rtl" : "ltr";
  }, [language]);

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useT must be used within I18nProvider");
  }
  return context;
}
