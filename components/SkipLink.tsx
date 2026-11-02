"use client";

import { useT } from "@/components/LanguageProvider";

export function SkipLink() {
  const t = useT();
  return (
    <a className="skip-link" href="#content">
      {t("a11y.skipToContent")}
    </a>
  );
}
