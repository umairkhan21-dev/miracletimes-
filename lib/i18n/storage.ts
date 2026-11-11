import {
  DEFAULT_LOCALE,
  LANG_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore private-mode / blocked storage */
  }
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.uiLang = locale;
  window.dispatchEvent(new Event("miracle-times-lang"));
}

/**
 * Language boot runs from `/lang-boot.js` (see `public/lang-boot.js`) so the
 * Contabo/Nginx CSP can avoid trusting arbitrary inline boot code.
 * JSON-LD still uses a small inline script with `<` escaped — documented CSP tradeoff.
 */
