"use client";

import { EmptyState } from "@/components/EmptyState";
import { useT } from "@/components/LanguageProvider";
import { demoPath } from "@/lib/paths";

export function DemoNotFoundContent() {
  const t = useT();

  return (
    <div className="wrap page-block">
      <EmptyState
        title={t("notFound.title")}
        message={t("notFound.message")}
        action={{ href: demoPath("/"), label: t("category.goHome") }}
        heading="h1"
      />
      <p className="not-found-search">
        <a className="btn" href={`${demoPath("/search")}/`}>
          {t("search.findNews")}
        </a>
      </p>
    </div>
  );
}
