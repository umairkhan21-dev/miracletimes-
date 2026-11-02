import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey } from "@/messages/hi";

type IstParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

function istParts(iso: string): IstParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function clock(parts: IstParts, locale: Locale) {
  const period = translate(locale, parts.hour < 12 ? "date.am" : "date.pm");
  const hour = parts.hour % 12 || 12;
  const minute = String(parts.minute).padStart(2, "0");
  return `${hour}:${minute} ${period}`;
}

function monthKey(month: number): MessageKey {
  return `date.month.${month}` as MessageKey;
}

function weekdayKey(weekday: number): MessageKey {
  return `date.weekday.${weekday}` as MessageKey;
}

export function formatLongDate(iso: string, locale: Locale = DEFAULT_LOCALE) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${translate(locale, weekdayKey(parts.weekday))}, ${parts.day} ${translate(locale, monthKey(parts.month))} ${parts.year}`;
}

export function formatDate(iso: string, locale: Locale = DEFAULT_LOCALE) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${parts.day} ${translate(locale, monthKey(parts.month))} ${parts.year}`;
}

export function formatDateTime(iso: string, locale: Locale = DEFAULT_LOCALE) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${formatDate(iso, locale)}, ${clock(parts, locale)}`;
}

export function formatTime(iso: string, locale: Locale = DEFAULT_LOCALE) {
  const parts = istParts(iso);
  if (!parts) return "";
  return clock(parts, locale);
}
