"use client";

import { CategoryPage } from "@/components/CategoryPage";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/ContentStatus";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError } from "@/lib/api";
import {
  categoryDescriptionKey,
  categoryName,
  getCategory,
} from "@/lib/categories";
import { loadArticlesByCategory } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import { useEffect, useState } from "react";

export function LocalizedCategoryView({
  slug,
  pageSize = 12,
  initialLocale,
  initialArticles,
}: {
  slug: string;
  pageSize?: number;
  initialLocale?: Locale;
  initialArticles?: Article[];
}) {
  const { locale, t } = useI18n();
  const category = getCategory(slug);
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

    loadArticlesByCategory(locale, slug, { limit: 60 })
      .then((items) => {
        if (cancelled) return;
        setArticles(items);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          error instanceof ApiError ? error.message : "Category load failed",
        );
        setArticles([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [locale, slug, initialArticles, initialLocale]);

  if (!category) return null;

  const title = categoryName(slug, locale);
  const descKey = categoryDescriptionKey(slug);
  const description = descKey ? t(descKey) : category.description;
  const crumbs = [
    { label: t("nav.home"), href: demoPath("/") },
    { label: title },
  ];

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
      title={title}
      description={description}
      articles={articles}
      pageSize={pageSize}
      crumbs={crumbs}
    />
  );
}
