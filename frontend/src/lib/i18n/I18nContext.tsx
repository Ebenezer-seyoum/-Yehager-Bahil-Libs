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

function isSupportedLanguage(code: string | null): code is string {
  return Boolean(code && LANGUAGES.some((language) => language.code === code));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Keep the first client render identical to the server render. Reading
  // localStorage here can produce different markup in production when a
  // visitor already has a saved language preference, causing React hydration
  // error #418.
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  const setLanguage = useCallback((code: string) => {
    if (!isSupportedLanguage(code)) return;
    setLanguageState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(stored)) setLanguageState(stored);
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
