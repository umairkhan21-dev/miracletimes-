"use client";

import { useT } from "@/components/LanguageProvider";

export function SampleBanner() {
  const t = useT();
  return <p className="sample-banner">{t("brand.sampleBanner")}</p>;
}
