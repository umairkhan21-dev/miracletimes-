export {
  DEFAULT_LOCALE,
  LANG_STORAGE_KEY,
  LOCALES,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
export { readStoredLocale, writeStoredLocale } from "@/lib/i18n/storage";
export { getDictionary, translate, type TranslateValues } from "@/lib/i18n/translate";
