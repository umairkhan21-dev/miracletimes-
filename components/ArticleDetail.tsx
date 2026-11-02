"use client";

import { ArticleList } from "@/components/ArticleList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/ContentStatus";
import { EmptyState } from "@/components/EmptyState";
import { NewsImage } from "@/components/NewsImage";
import { ShareButtons } from "@/components/ShareButtons";
import { useI18n } from "@/components/LanguageProvider";
import { ApiError, resolveArticleForLocale } from "@/lib/api";
import { categoryName } from "@/lib/categories";
import {
  loadArticles,
  loadArticlesByCategory,
  selectAdjacent,
  selectLatest,
  selectRelated,
} from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { demoAbsoluteUrl, demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Article } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | {
      status: "ready";
      article: Article;
      related: Article[];
      latest: Article[];
      newer?: Article;
      older?: Article;
    };

export function ArticleDetail({ slug }: { slug: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const resolved = await resolveArticleForLocale(slug, locale);
        if (cancelled) return;

        if (!resolved) {
          setState({ status: "missing" });
          return;
        }

        if (resolved.canonicalSlug !== slug) {
          router.replace(demoPath(`/news/${resolved.canonicalSlug}`));
        }

        const [categoryArticles, allArticles] = await Promise.all([
          loadArticlesByCategory(locale, resolved.article.category),
          loadArticles(locale),
        ]);
        if (cancelled) return;

        const { newer, older } = selectAdjacent(
          categoryArticles,
          resolved.article,
        );

        setState({
          status: "ready",
          article: resolved.article,
          related: selectRelated(categoryArticles, resolved.article),
          latest: selectLatest(allArticles, resolved.article.id, 5),
          newer,
          older,
        });
      } catch (error) {
        if (cancelled) return;
        console.error(
          error instanceof ApiError ? error.message : "Article load failed",
        );
        setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, locale, router]);

  if (state.status === "loading") {
    return <ContentLoading message={t("content.loading")} />;
  }

  if (state.status === "error") {
    return (
      <ContentUnavailable
        title={t("content.unavailableTitle")}
        message={t("content.unavailableMessage")}
        actionLabel={t("category.goHome")}
      />
    );
  }

  if (state.status === "missing") {
    return (
      <div className="wrap page-block">
        <EmptyState
          title={t("content.articleMissingTitle")}
          message={t("content.articleMissingMessage")}
          action={{ href: demoPath("/"), label: t("category.goHome") }}
          heading="h1"
        />
      </div>
    );
  }

  const { article, related, latest, newer, older } = state;
  const name = categoryName(article.category, locale);
  const categoryHref = demoPath(`/category/${article.category}`);
  const url = demoAbsoluteUrl(site.url, `/news/${article.slug}`);
  const imageUrl = article.image
    ? article.image.startsWith("http")
      ? article.image
      : `${site.url}${article.image}`
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: locale,
    articleSection: name,
    ...(imageUrl ? { image: [imageUrl] } : {}),
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}/mark.png`,
      },
    },
    mainEntityOfPage: url,
    isBasedOn: site.sampleNotice,
  };

  return (
    <article className="wrap article-page">
      <Breadcrumbs
        items={[
          { label: t("nav.home"), href: demoPath("/") },
          { label: name, href: categoryHref },
          { label: article.title },
        ]}
      />
      <header className="story-header">
        <p className="kicker">
          <Link href={categoryHref}>{name}</Link>
          <span className="sample-tag">{t("label.sample")}</span>
        </p>
        <h1>{article.title}</h1>
        <p className="story-dek">{article.summary}</p>
        <p className="meta story-meta">
          <span>{article.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>
            {t("label.published")}: {formatDateTime(article.publishedAt, locale)}
          </time>
          {article.updatedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={article.updatedAt}>
                {t("label.updated")}: {formatDateTime(article.updatedAt, locale)}
              </time>
            </>
          ) : null}
        </p>
        <ShareButtons title={article.title} summary={article.summary} path={url} />
      </header>

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
        {article.imageCaption ? <figcaption>{article.imageCaption}</figcaption> : null}
      </figure>

      <p className="sample-note">{t("article.sampleNote")}</p>

      <div className="story-body">
        {article.content.map((block, index) =>
          block.type === "h2" ? (
            <h2 key={`${article.id}-h-${index}`}>{block.text}</h2>
          ) : (
            <p key={`${article.id}-p-${index}`}>{block.text}</p>
          ),
        )}
      </div>

      <p className="story-back">
        <Link href={categoryHref}>{t("article.allInCategory", { name })}</Link>
        <Link href={demoPath("/")}>{t("nav.home")}</Link>
      </p>

      {older || newer ? (
        <nav className="story-pager" aria-label={t("a11y.prevNextStory")}>
          {older ? (
            <Link href={demoPath(`/news/${older.slug}`)} className="story-pager-link">
              <span>{t("article.prev")}</span>
              <strong>{older.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={demoPath(`/news/${newer.slug}`)} className="story-pager-link is-next">
              <span>{t("article.next")}</span>
              <strong>{newer.title}</strong>
            </Link>
          ) : null}
        </nav>
      ) : null}

      {related.length ? (
        <section className="story-more" aria-labelledby="related-title">
          <h2 id="related-title">{t("article.related")}</h2>
          <ArticleList articles={related} variant="row" />
        </section>
      ) : null}

      {latest.length ? (
        <section className="story-more" aria-labelledby="latest-title">
          <h2 id="latest-title">{t("article.latest")}</h2>
          <ArticleList articles={latest} variant="text" />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
