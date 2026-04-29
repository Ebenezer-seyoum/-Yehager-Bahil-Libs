// Language registry — English is the default. Local Ethiopian languages highlighted for visitors.
export const LANGUAGES = [
  // Local Ethiopian languages — highlighted for visitors
  { code: "am", name: "Amharic", nativeName: "አማርኛ", flag: "🇪🇹", group: "local" },
  { code: "om", name: "Afan Oromo", nativeName: "Afaan Oromoo", flag: "🇪🇹", group: "local" },
  { code: "ti", name: "Tigrigna", nativeName: "ትግርኛ", flag: "🇪🇹", group: "local" },

  // International languages — alphabetical by English name
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", group: "international", rtl: true },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", group: "international" },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", group: "international" },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", group: "international" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", group: "international" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", group: "international" },
  { code: "tl", name: "Filipino", nativeName: "Filipino", flag: "🇵🇭", group: "international" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", group: "international" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", group: "international" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", group: "international" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷", group: "international" },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", group: "international", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", group: "international" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", group: "international" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", group: "international" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", group: "international" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", group: "international" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", group: "international" },
  { code: "fa", name: "Persian", nativeName: "فارسی", flag: "🇮🇷", group: "international", rtl: true },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", group: "international" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", group: "international" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", group: "international" },
  { code: "so", name: "Somali", nativeName: "Soomaali", flag: "🇸🇴", group: "international" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", group: "international" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", group: "international" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", group: "international" },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭", group: "international" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", group: "international" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦", group: "international" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", group: "international" },
];

export const DEFAULT_LANGUAGE = "en";