"use client";

import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/ContentStatus";
import { EmptyState } from "@/components/EmptyState";
import { HomePageContent } from "@/components/HomePageContent";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/api";
import { loadHomepageBundle, type HomeSection } from "@/lib/content";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import { useEffect, useState } from "react";

type HomepageBundle = {
  lead: Article | null;
  supporting: Article[];
  latestSide: Article[];
  fresh: Article[];
  sections: HomeSection[];
  breaking: Article[];
  trending: Article[];
  counts: Array<{
    slug: string;
    name: string;
    english: string;
    href: string;
    count: number;
  }>;
};

export function HomePageLoader({
  jsonLd,
}: {
  jsonLd: Record<string, unknown>;
}) {
  const { locale, t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [data, setData] = useState<HomepageBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    loadHomepageBundle(locale)
      .then((bundle) => {
        if (cancelled) return;
        setData(bundle);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          error instanceof ApiError ? error.message : "Homepage load failed",
        );
        setData(null);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (status === "loading") {
    return <ContentLoading message={t("content.loading")} />;
  }

  if (status === "error") {
    return (
      <ContentUnavailable
        title={t("content.unavailableTitle")}
        message={t("content.unavailableMessage")}
        actionLabel={t("category.goHome")}
      />
    );
  }

  if (!data?.lead) {
    return (
      <div className="wrap page-block">
        <EmptyState
          title={t("content.emptyHomeTitle")}
          message={t("content.emptyHomeMessage")}
          action={{ href: demoPath("/latest"), label: t("home.moreStories") }}
          heading="h1"
        />
      </div>
    );
  }

  return (
    <HomePageContent
      lead={data.lead}
      supporting={data.supporting}
      latestSide={data.latestSide}
      fresh={data.fresh}
      sections={data.sections}
      breaking={data.breaking}
      trending={data.trending}
      counts={data.counts}
      jsonLd={jsonLd}
    />
  );
}
