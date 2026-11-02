"use client";

import { useT } from "@/components/LanguageProvider";

export function SearchPageFallback() {
  const t = useT();
  return <p className="wrap page-block">{t("search.preparing")}</p>;
}
