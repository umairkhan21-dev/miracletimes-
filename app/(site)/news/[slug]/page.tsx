import { ArticleDetail } from "@/components/ArticleDetail";
import {
  fetchPublishedSlugs,
  resolveArticleForLocale,
} from "@/lib/api";
import {
  loadArticleForMetadata,
  loadArticlePageBundle,
} from "@/lib/articlePage";
import { categoryName } from "@/lib/categories";
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
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await fetchPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.warn(
      "Could not load article slugs from API during build:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const loaded = await loadArticleForMetadata(slug);
    if (!loaded) {
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
  } catch {
    return { title: "खबर नहीं मिली" };
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const bundle = await loadArticlePageBundle(slug).catch(() => null);
  if (!bundle?.article) {
    notFound();
  }

  const article = bundle.article;
  const language = bundle.language;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildArticleJsonLd({
              article,
              language,
              section: categoryName(article.category, language),
            }),
          ).replace(/</g, "\\u003c"),
        }}
      />
      <ArticleDetail slug={slug} initialBundle={bundle} />
    </>
  );
}
