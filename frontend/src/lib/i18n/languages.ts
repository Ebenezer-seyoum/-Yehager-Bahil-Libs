export type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  group: "local" | "international";
  priority?: boolean;
  rtl?: boolean;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", group: "international", priority: true },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹", group: "local", priority: true },
  { code: "om", name: "Afaan Oromo", nativeName: "Afaan Oromoo", flag: "🇪🇹", group: "local", priority: true },
  { code: "ti", name: "Tigrinya", nativeName: "ትግርኛ", flag: "🇪🇹", group: "local", priority: true },
  { code: "so", name: "Somali", nativeName: "Soomaali", flag: "🇪🇹", group: "local" },
  { code: "aa", name: "Afar", nativeName: "Qafar af", flag: "🇪🇹", group: "local" },
  { code: "sid", name: "Sidama", nativeName: "Sidaamu Afoo", flag: "🇪🇹", group: "local" },
  { code: "wal", name: "Wolaytta", nativeName: "Wolaytta", flag: "🇪🇹", group: "local" },
  { code: "gur", name: "Gurage", nativeName: "Gurage", flag: "🇪🇹", group: "local" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", group: "international", rtl: true },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", group: "international" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", group: "international" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", group: "international" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", group: "international" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", group: "international" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", group: "international" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", group: "international" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", group: "international" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", group: "international" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", group: "international" },
];

export const DEFAULT_LANGUAGE = "en";
