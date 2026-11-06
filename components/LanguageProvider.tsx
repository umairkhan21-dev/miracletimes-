"use client";

import {
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/config";
import {
  readStoredLocale,
  writeStoredLocale,
} from "@/lib/i18n/storage";
import {
  translate,
  type TranslateValues,
} from "@/lib/i18n/translate";
import type { MessageKey } from "@/messages/hi";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: TranslateValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("miracle-times-lang", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("miracle-times-lang", onStoreChange);
  };
}

function getSnapshot(): Locale {
  return readStoredLocale();
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, values?: TranslateValues) => translate(locale, key, values),
    [locale],
  );

  useLayoutEffect(() => {
    const htmlLang = locale === "hi" ? "hi" : "en";
    document.documentElement.dataset.uiLang = locale;
    document.documentElement.lang = htmlLang;
    const shell = document.querySelector(".site-shell");
    if (shell instanceof HTMLElement) {
      shell.lang = htmlLang;
      shell.classList.add("is-lang-ready");
    }
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}

export function useLocale() {
  return useI18n().locale;
}

export function useT() {
  return useI18n().t;
}
