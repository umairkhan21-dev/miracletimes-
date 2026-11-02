import { en } from "@/messages/en";
import { hi, type MessageKey } from "@/messages/hi";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const dictionaries = { hi, en } as const;

export type TranslateValues = Record<string, string | number>;

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: TranslateValues,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const template = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in values ? String(values[name]) : `{${name}}`,
  );
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
