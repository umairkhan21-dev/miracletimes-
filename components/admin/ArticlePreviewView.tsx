"use client";

import { NewsImage } from "@/components/NewsImage";
import { categoryName } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Article } from "@/lib/types";
import type { ArticleStatus } from "@/lib/admin/types";
import Link from "next/link";

type Props = {
  article: Article;
  language: Locale;
  status: ArticleStatus;
  articleId: number;
};

export function ArticlePreviewView({
  article,
  language,
  status,
  articleId,
}: Props) {
  const name = categoryName(article.category, language);
  const isPublic = status === "published";

  return (
    <div className="admin-article-preview">
      <div className="admin-preview-banner">
        <div>
          <strong>Admin preview</strong>
          <span>
            Status: {status}
            {isPublic
              ? " — also visible on the public site"
              : " — not visible to the public until published"}
          </span>
        </div>
        <div className="admin-preview-banner-actions">
          <Link
            className="admin-btn admin-btn-sm"
            href={`/admin/articles/edit/?id=${articleId}`}
          >
            Edit
          </Link>
          {isPublic ? (
            <a
              className="admin-btn admin-btn-sm"
              href={`/news/${article.slug}/`}
              target="_blank"
              rel="noreferrer"
            >
              Open public page
            </a>
          ) : null}
          <Link className="admin-btn admin-btn-sm" href="/admin/articles/">
            Back to list
          </Link>
        </div>
      </div>

      <article className="wrap article-page">
        <header className="story-header">
          <p className="kicker">{name}</p>
          <h1>{article.title}</h1>
          {article.summary ? <p className="story-dek">{article.summary}</p> : null}
          <p className="meta story-meta">
            <span>{article.author}</span>
            {article.publishedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt}>
                  {formatDateTime(article.publishedAt, language)}
                </time>
              </>
            ) : (
              <>
                <span aria-hidden="true">·</span>
                <span>Unpublished draft</span>
              </>
            )}
          </p>
        </header>

        {article.image ? (
          <figure className="story-figure">
            <div className="media media-lead">
              <NewsImage
                src={article.image}
                alt={article.imageAlt}
                priority
                position={article.imagePosition}
                sizes="(max-width: 760px) 100vw, 760px"
              />
            </div>
            {article.imageCaption ? (
              <figcaption>{article.imageCaption}</figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="story-body">
          {article.content.length ? (
            article.content.map((block, index) =>
              block.type === "h2" ? (
                <h2 key={`${article.id}-h-${index}`}>{block.text}</h2>
              ) : (
                <p key={`${article.id}-p-${index}`}>{block.text}</p>
              ),
            )
          ) : (
            <p className="admin-muted">No content blocks yet.</p>
          )}
        </div>
      </article>
    </div>
  );
}
