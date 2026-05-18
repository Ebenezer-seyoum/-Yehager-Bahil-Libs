export type Language = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  group: "local" | "international";
  rtl?: boolean;
};

export const LANGUAGES: Language[] = [
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹", group: "local" },
  { code: "om", name: "Afan Oromo", nativeName: "Afaan Oromoo", flag: "🇪🇹", group: "local" },
  { code: "ti", name: "Tigrigna", nativeName: "ትግርኛ", flag: "🇪🇹", group: "local" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", group: "international" },
];

export const DEFAULT_LANGUAGE = "en";
