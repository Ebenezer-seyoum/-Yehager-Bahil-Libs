import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/i18n/I18nContext";

// In-memory + sessionStorage cache for product translations
const memCache = new Map();

const cacheKey = (productId, lang, field) => `ybl_pt_${productId}_${lang}_${field}`;

const getCached = (productId, lang, fields) => {
  const k = `${productId}_${lang}`;
  if (memCache.has(k)) return memCache.get(k);
  if (typeof window === "undefined") return null;
  const out = {};
  let any = false;
  for (const f of fields) {
    const v = sessionStorage.getItem(cacheKey(productId, lang, f));
    if (v != null) { out[f] = v; any = true; }
  }
  return any ? out : null;
};

const setCached = (productId, lang, data) => {
  const k = `${productId}_${lang}`;
  memCache.set(k, data);
  if (typeof window === "undefined") return;
  for (const [f, v] of Object.entries(data)) {
    if (v != null) sessionStorage.setItem(cacheKey(productId, lang, f), String(v));
  }
};

const LANG_NAMES = {
  am: "Amharic (አማርኛ)",
  om: "Afaan Oromoo",
  ti: "Tigrigna (ትግርኛ)",
  en: "English",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese (Simplified)",
  sw: "Swahili",
};

export function useTranslatedProduct(product) {
  const { language } = useT();
  const [translated, setTranslated] = useState(product);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!product) return;
    if (language === "en") {
      setTranslated(product);
      return;
    }

    const fields = ["name", "description", "fabric_type", "embroidery_style", "subcategory"];
    // Clear old bad translations from cache (force re-translate with Gemini)
    // Only use cache if the cached entry was generated after the gemini upgrade
    const CACHE_VERSION = "v2_gemini";
    const versionKey = `ybl_cache_ver_${product.id}_${language}`;
    const cachedVersion = typeof window !== "undefined" ? sessionStorage.getItem(versionKey) : null;
    const cached = cachedVersion === CACHE_VERSION ? getCached(product.id, language, fields) : null;
    if (cached) {
      setTranslated({ ...product, ...cached });
      return;
    }

    let cancelled = false;
    setTranslating(true);
    (async () => {
      const sourceObj = {
        name: product.name || "",
        description: product.description || "",
        fabric_type: product.fabric_type || "",
        embroidery_style: product.embroidery_style || "",
        subcategory: product.subcategory || "",
      };
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `You are a professional translator specializing in Ethiopian languages. Translate the following Ethiopian traditional clothing product details from English to ${LANG_NAMES[language] || language}.

Rules:
- Produce natural, grammatically correct ${LANG_NAMES[language] || language} that a native speaker would write
- Keep proper nouns and cultural textile terms as-is: Habesha, Tilet, Tibeb, Netela, Kemis, Gabi, Shemma, Wollega, Harar, Gondar, Tigray
- Keep brand names, color names, and product codes (like ORO-WOL-005) unchanged
- Do NOT transliterate word-by-word — translate the meaning naturally
- Use correct grammar and natural phrasing for the target language

Source text to translate:
${JSON.stringify(sourceObj, null, 2)}`,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              fabric_type: { type: "string" },
              embroidery_style: { type: "string" },
              subcategory: { type: "string" },
            },
          },
        });
        if (cancelled) return;
        const data = res || {};
        setCached(product.id, language, data);
        if (typeof window !== "undefined") sessionStorage.setItem(versionKey, CACHE_VERSION);
        setTranslated({ ...product, ...data });
      } catch {
        if (!cancelled) setTranslated(product);
      } finally {
        if (!cancelled) setTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [product, language]);

  return { product: translated, translating };
}