"use client";

import { useI18n } from "@/components/LanguageProvider";
import { formatLongDate } from "@/lib/format";
import { useEffect, useState } from "react";

export function CurrentDate() {
  const { locale, t } = useI18n();
  const [iso, setIso] = useState("");

  useEffect(() => {
    setIso(new Date().toISOString());
  }, []);

  return (
    <p className="utility-date">
      <time dateTime={iso || undefined}>
        {iso ? formatLongDate(iso, locale) : t("label.today")}
      </time>
    </p>
  );
}
