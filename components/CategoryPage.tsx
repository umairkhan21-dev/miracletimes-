"use client";

import { ArticleCard } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { PagedArticleList } from "@/components/PagedArticleList";
import { useT } from "@/components/LanguageProvider";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import type { MessageKey } from "@/messages/hi";
import { Suspense } from "react";

export function CategoryPage({
  title,
  description,
  titleKey,
  descriptionKey,
  articles,
  crumbs,
  pageSize = 4,
}: {
  title?: string;
  description?: string;
  titleKey?: MessageKey;
  descriptionKey?: MessageKey;
  articles: Article[];
  crumbs?: { label: string; href?: string }[];
  pageSize?: number;
}) {
  const t = useT();
  const resolvedTitle = titleKey ? t(titleKey) : (title ?? "");
  const resolvedDescription = descriptionKey
    ? t(descriptionKey)
    : description;

  if (!articles.length) {
    return (
      <div className="wrap page-block">
        <Breadcrumbs
          items={
            crumbs ?? [
              { label: t("nav.home"), href: demoPath("/") },
              { label: resolvedTitle },
            ]
          }
        />
        <EmptyState
          title={t("category.emptyTitle")}
          message={t("category.emptyMessage")}
          action={{ href: demoPath("/"), label: t("category.goHome") }}
          heading="h1"
        />
      </div>
    );
  }

  const [feature, ...rest] = articles;

  return (
    <div className="wrap page-block">
      <Breadcrumbs
        items={
          crumbs ?? [
            { label: t("nav.home"), href: demoPath("/") },
            { label: resolvedTitle },
          ]
        }
      />
      <header className="page-intro">
        <h1>{resolvedTitle}</h1>
        {resolvedDescription ? <p>{resolvedDescription}</p> : null}
      </header>
      {feature ? (
        <ArticleCard article={feature} variant="feature" heading="h2" priority />
      ) : null}
      <section className="feed-section" aria-labelledby="feed-heading">
        <h2 id="feed-heading" className="feed-heading">
          {t("category.feedHeading")}
        </h2>
        <Suspense fallback={<p className="feed-note">{t("category.loading")}</p>}>
          <PagedArticleList articles={rest} pageSize={pageSize} />
        </Suspense>
      </section>
    </div>
  );
}
