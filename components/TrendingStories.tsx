"use client";

import { useI18n } from "@/components/LanguageProvider";
import { categoryName } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function TrendingStories({ articles }: { articles: Article[] }) {
  const { locale, t } = useI18n();
  if (!articles.length) return null;

  return (
    <section className="trending" aria-labelledby="trending-title">
      <header className="section-head">
        <h2 id="trending-title">{t("trending.title")}</h2>
      </header>
      <p className="trending-note">{t("trending.note")}</p>
      <ol className="trending-list">
        {articles.map((article, index) => (
          <li key={article.id}>
            <span className="trend-num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>
                <Link href={demoPath(`/news/${article.slug}`)}>{article.title}</Link>
              </h3>
              <p className="meta">
                <Link href={demoPath(`/category/${article.category}`)}>
                  {categoryName(article.category, locale)}
                </Link>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt}>
                  {formatDate(article.publishedAt, locale)}
                </time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
