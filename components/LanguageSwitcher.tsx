"use client";

import { useI18n } from "@/components/LanguageProvider";
import type { Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      className={`lang-switch${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={t("a11y.language")}
    >
      <button
        type="button"
        className="lang-btn"
        aria-pressed={locale === "hi"}
        aria-label={t("lang.switchToHi")}
        onClick={() => select("hi")}
      >
        {t("lang.hi")}
      </button>
      <span className="lang-sep" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className="lang-btn"
        aria-pressed={locale === "en"}
        aria-label={t("lang.switchToEn")}
        onClick={() => select("en")}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
