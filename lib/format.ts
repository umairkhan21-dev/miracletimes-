const months = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्टूबर",
  "नवंबर",
  "दिसंबर",
];

const weekdays = [
  "रविवार",
  "सोमवार",
  "मंगलवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
];

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

function clock(parts: IstParts) {
  const period = parts.hour < 12 ? "पूर्वाह्न" : "अपराह्न";
  const hour = parts.hour % 12 || 12;
  const minute = String(parts.minute).padStart(2, "0");
  return `${hour}:${minute} ${period}`;
}

export function formatLongDate(iso: string) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${weekdays[parts.weekday]}, ${parts.day} ${months[parts.month]} ${parts.year}`;
}

export function formatDate(iso: string) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${parts.day} ${months[parts.month]} ${parts.year}`;
}

export function formatDateTime(iso: string) {
  const parts = istParts(iso);
  if (!parts) return "";
  return `${formatDate(iso)}, ${clock(parts)}`;
}

export function formatTime(iso: string) {
  const parts = istParts(iso);
  if (!parts) return "";
  return clock(parts);
}
