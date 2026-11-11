"use client";

import { CategoryPage } from "@/components/CategoryPage";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/ContentStatus";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/api";
import { loadLatestArticles } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import type { Article } from "@/lib/types";
import { useEffect, useState } from "react";

export function LatestPageContent({
  initialLocale,
  initialArticles,
}: {
  initialLocale?: Locale;
  initialArticles?: Article[];
} = {}) {
  const { locale, t } = useI18n();
  const hasServerArticles =
    Array.isArray(initialArticles) &&
    (!initialLocale || initialLocale === locale);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    hasServerArticles ? "ready" : "loading",
  );
  const [articles, setArticles] = useState<Article[]>(
    hasServerArticles ? initialArticles! : [],
  );

  useEffect(() => {
    let cancelled = false;

    if (Array.isArray(initialArticles) && initialLocale === locale) {
      setArticles(initialArticles);
      setStatus("ready");
      return () => {
        cancelled = true;
      };
    }

    setStatus("loading");

    loadLatestArticles(locale, { limit: 60 })
      .then(({ articles: items }) => {
        if (cancelled) return;
        setArticles(items);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          error instanceof ApiError ? error.message : "Latest load failed",
        );
        setArticles([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [locale, initialArticles, initialLocale]);

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

  return (
    <CategoryPage
      titleKey="latest.title"
      descriptionKey="latest.description"
      articles={articles}
      pageSize={6}
    />
  );
}
