import { ArticleDetail } from "@/components/ArticleDetail";
import {
  fetchArticleBySlug,
  fetchPublishedSlugs,
  resolveArticleForLocale,
} from "@/lib/api";
import { categoryName } from "@/lib/categories";
import { getDemoSlugs } from "@/lib/demoContent";
import {
  articleCanonicalUrl,
  buildArticleJsonLd,
  buildArticleOpenGraph,
  documentTitle,
  effectiveSeoDescription,
  effectiveSeoTitle,
  publicShareImageUrl,
  seoHtmlLang,
} from "@/lib/seo";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

// Literal required by Next. Keep `true` for local preview of new articles.
// `npm run build:export` temporarily sets this to `false` for static export.
export const dynamicParams = true;

export async function generateStaticParams() {
  const isStaticExport = process.env.STATIC_EXPORT === "1";

  try {
    const slugs = await fetchPublishedSlugs();
    if (slugs.length) {
      return slugs.map((slug) => ({ slug }));
    }
  } catch (error) {
    console.warn(
      "Could not load article slugs from API during build:",
      error instanceof Error ? error.message : error,
    );
  }

  const demoSlugs = getDemoSlugs();
  if (demoSlugs.length) {
    return demoSlugs.map((slug) => ({ slug }));
  }

  if (isStaticExport) {
    throw new Error(
      "STATIC_EXPORT build found zero article slugs (API empty and no demo corpus).",
    );
  }

  return [];
}

async function loadArticleForMetadata(slug: string) {
  const article =
    (await fetchArticleBySlug(slug, "hi").catch(() => null)) ??
    (await fetchArticleBySlug(slug, "en").catch(() => null));
  if (!article) return null;
  const language = article.language === "en" ? "en" : "hi";
  return { article, language } as const;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const isStaticExport = process.env.STATIC_EXPORT === "1";

  try {
    const loaded = await loadArticleForMetadata(slug);
    if (!loaded) {
      if (isStaticExport) {
        throw new Error(
          `STATIC_EXPORT could not load article metadata for slug "${slug}".`,
        );
      }
      return { title: "खबर नहीं मिली" };
    }

    const { article, language } = loaded;
    const title = effectiveSeoTitle(article.seoTitle, article.title);
    const description = effectiveSeoDescription(
      article.seoDescription,
      article.summary,
    );
    const name = categoryName(article.category, language);
    const canonical = articleCanonicalUrl(article.slug);
    const shareImage = publicShareImageUrl(article.image);
    const otherLanguage = language === "hi" ? "en" : "hi";
    const sibling = await resolveArticleForLocale(
      article.slug,
      otherLanguage,
    ).catch(() => null);

    const languages: Record<string, string> = {
      [language]: canonical,
    };
    if (
      sibling?.article.slug &&
      sibling.article.slug !== article.slug &&
      sibling.article.language === otherLanguage
    ) {
      languages[otherLanguage] = articleCanonicalUrl(sibling.article.slug);
    }

    return {
      title: documentTitle(title),
      description: description || undefined,
      authors: [{ name: article.author }],
      alternates: {
        canonical,
        languages,
      },
      openGraph: buildArticleOpenGraph({
        title,
        description,
        url: canonical,
        language,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        authors: [article.author],
        section: name,
        image: shareImage,
        imageAlt: article.imageAlt,
      }),
      twitter: {
        card: shareImage ? "summary_large_image" : "summary",
        title,
        description,
        ...(shareImage ? { images: [shareImage] } : {}),
      },
      other: {
        language: seoHtmlLang(language),
      },
    };
  } catch (error) {
    if (isStaticExport) {
      throw error;
    }
    return { title: "खबर नहीं मिली" };
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const loaded = await loadArticleForMetadata(slug).catch(() => null);

  return (
    <>
      {loaded ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildArticleJsonLd({
                article: loaded.article,
                language: loaded.language,
                section: categoryName(
                  loaded.article.category,
                  loaded.language,
                ),
              }),
            ).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <ArticleDetail slug={slug} />
    </>
  );
}
