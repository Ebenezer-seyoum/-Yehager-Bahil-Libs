import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LANGUAGES, DEFAULT_LANGUAGE } from "./languages";
import { TRANSLATIONS } from "./translations";

const STORAGE_KEY = "ybl_language";
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((code) => {
    if (TRANSLATIONS[code]) {
      setLanguageState(code);
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  // Set HTML lang + dir for accessibility / RTL
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    const langDef = LANGUAGES.find((l) => l.code === language);
    document.documentElement.dir = langDef?.rtl ? "rtl" : "ltr";
  }, [language]);

  const t = useCallback(
    (key) => {
      return (
        TRANSLATIONS[language]?.[key] ??
        TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ??
        key
      );
    },
    [language]
  );

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, currentLang, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}