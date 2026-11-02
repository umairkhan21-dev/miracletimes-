export const LOCALES = ["hi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "hi";
export const LANG_STORAGE_KEY = "miracle-times-ui-lang";

export function isLocale(value: unknown): value is Locale {
  return value === "hi" || value === "en";
}
