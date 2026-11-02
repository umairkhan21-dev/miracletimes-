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

/** Inline script: apply stored language before paint to limit wrong-language flash. */
export const langBootScript = `(function(){try{var k=${JSON.stringify(LANG_STORAGE_KEY)};var v=localStorage.getItem(k);if(v==="hi"||v==="en"){document.documentElement.dataset.uiLang=v;document.documentElement.lang=v==="hi"?"hi":"en";}else{document.documentElement.dataset.uiLang=${JSON.stringify(DEFAULT_LOCALE)};}}catch(e){document.documentElement.dataset.uiLang=${JSON.stringify(DEFAULT_LOCALE)};}})();`;
