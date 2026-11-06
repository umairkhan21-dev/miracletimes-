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
 * Inline script: apply language before paint.
 * Preference order: stored UI locale → <meta name="language"> (article content)
 * → site default. Also syncs the nearest .site-shell wrapper.
 */
export const langBootScript = `(function(){try{var k=${JSON.stringify(LANG_STORAGE_KEY)};var stored=localStorage.getItem(k);var lang;if(stored==="hi"||stored==="en"){lang=stored;}else{var meta=document.querySelector('meta[name="language"]');var m=meta&&meta.getAttribute("content");lang=(m==="en"||m==="hi")?m:${JSON.stringify(DEFAULT_LOCALE)};}var htmlLang=lang==="hi"?"hi":"en";document.documentElement.dataset.uiLang=lang;document.documentElement.lang=htmlLang;var shell=document.currentScript&&document.currentScript.parentElement;if(shell&&shell.classList&&shell.classList.contains("site-shell")){shell.lang=htmlLang;}}catch(e){document.documentElement.dataset.uiLang=${JSON.stringify(DEFAULT_LOCALE)};}})();`;
