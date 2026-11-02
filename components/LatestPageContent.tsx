"use client";

import { CategoryPage } from "@/components/CategoryPage";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/ContentStatus";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/api";
import { loadArticles } from "@/lib/content";
import type { Article } from "@/lib/types";
import { useEffect, useState } from "react";

export function LatestPageContent() {
  const { locale, t } = useI18n();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    loadArticles(locale)
      .then((items) => {
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

  return (
    <CategoryPage
      titleKey="latest.title"
      descriptionKey="latest.description"
      articles={articles}
      pageSize={6}
    />
  );
}
