"use client";

import { NewsImage } from "@/components/NewsImage";
import { useI18n } from "@/components/LanguageProvider";
import { categoryName } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function LeadStory({ article }: { article: Article }) {
  const { locale, t } = useI18n();
  const href = demoPath(`/news/${article.slug}`);
  const name = categoryName(article.category, locale);

  return (
    <article className="lead-story">
      <Link href={href} className="lead-media-link">
        <div className="media media-lead">
          <NewsImage
            src={article.image}
            alt={article.imageAlt}
            priority
            position={article.imagePosition}
            sizes="(max-width: 720px) 100vw, 640px"
          />
        </div>
      </Link>
      <div className="lead-copy">
        <p className="kicker">
          <Link href={demoPath(`/category/${article.category}`)}>{name}</Link>
        </p>
        <h1 className="lead-title">
          <Link href={href}>{article.title}</Link>
        </h1>
        <p className="lead-summary">{article.summary}</p>
        <p className="meta">
          <time dateTime={article.publishedAt}>
            {formatDateTime(article.publishedAt, locale)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{article.author}</span>
        </p>
      </div>
    </article>
  );
}
