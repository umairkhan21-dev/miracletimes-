import { absoluteSiteUrl } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Article } from "@/lib/types";
import type { Metadata } from "next";

export function trimSeo(value: string | null | undefined): string {
  return (value || "").trim();
}

/** Prefer explicit SEO title; otherwise fall back to the article title. */
export function effectiveSeoTitle(
  seoTitle: string | null | undefined,
  title: string,
): string {
  return trimSeo(seoTitle) || trimSeo(title);
}

/** Prefer explicit SEO description; otherwise fall back to the summary. */
export function effectiveSeoDescription(
  seoDescription: string | null | undefined,
  summary: string,
): string {
  return trimSeo(seoDescription) || trimSeo(summary);
}

/**
 * Build a document `<title>` that cooperates with the root layout template
 * (`%s — Miracle Times`) without doubling the brand when editors already
 * included it in the SEO title.
 */
export function documentTitle(seoOrHeadline: string): NonNullable<Metadata["title"]> {
  const trimmed = trimSeo(seoOrHeadline);
  if (!trimmed) return { absolute: site.name };
  if (/miracle\s*times/i.test(trimmed)) {
    return { absolute: trimmed };
  }
  return trimmed;
}

export function seoLocale(language: string | null | undefined): string {
  return language === "en" ? "en_IN" : "hi_IN";
}

export function seoHtmlLang(language: string | null | undefined): string {
  return language === "en" ? "en" : "hi";
}

export function articleCanonicalUrl(slug: string): string {
  return absoluteSiteUrl(site.url, `/news/${slug}`);
}

/**
 * Open Graph / Twitter image URLs must be publicly reachable absolute URLs.
 * Drop localhost / private build-time media hosts so they are not baked into
 * static HTML by accident.
 */
export function publicShareImageUrl(
  url: string | null | undefined,
): string | undefined {
  const value = trimSeo(url);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

export function buildArticleOpenGraph({
  title,
  description,
  url,
  language,
  publishedAt,
  updatedAt,
  authors,
  section,
  image,
  imageAlt,
}: {
  title: string;
  description: string;
  url: string;
  language?: string | null;
  publishedAt?: string;
  updatedAt?: string;
  authors?: string[];
  section?: string;
  image?: string;
  imageAlt?: string;
}) {
  const shareImage = publicShareImageUrl(image);
  return {
    type: "article" as const,
    title,
    description,
    url,
    siteName: site.name,
    locale: seoLocale(language),
    publishedTime: publishedAt,
    modifiedTime: updatedAt ?? publishedAt,
    section,
    authors,
    ...(shareImage
      ? { images: [{ url: shareImage, alt: imageAlt || title }] }
      : {}),
  };
}

export function buildArticleJsonLd({
  article,
  language,
  section,
}: {
  article: Article;
  language: string;
  section: string;
}) {
  const title = effectiveSeoTitle(article.seoTitle, article.title);
  const description = effectiveSeoDescription(
    article.seoDescription,
    article.summary,
  );
  const url = articleCanonicalUrl(article.slug);
  const image = publicShareImageUrl(article.image);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: language,
    articleSection: section,
    ...(image ? { image: [image] } : {}),
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
  };
}
