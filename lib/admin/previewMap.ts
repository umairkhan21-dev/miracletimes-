import { resolveMediaUrl } from "@/lib/api";
import type { AdminArticle } from "@/lib/admin/types";
import type { Locale } from "@/lib/i18n/config";
import type { Article } from "@/lib/types";

/** Pick the translation to preview; prefer requested language, then hi, then first. */
export function pickPreviewTranslation(
  article: AdminArticle,
  preferred: Locale | null | undefined,
) {
  const translations = article.translations || [];
  if (!translations.length) return null;
  if (preferred) {
    const match = translations.find((item) => item.languageCode === preferred);
    if (match) return match;
  }
  return (
    translations.find((item) => item.languageCode === "hi") || translations[0]
  );
}

/** Map an admin article + translation into the public Article shape for preview UI. */
export function adminArticleToPreviewArticle(
  article: AdminArticle,
  preferred?: Locale | null,
): { article: Article; language: Locale } | null {
  const translation = pickPreviewTranslation(article, preferred);
  if (!translation?.slug?.trim() || !translation.title?.trim()) return null;

  const language: Locale =
    translation.languageCode === "en" ? "en" : "hi";
  const category = article.categories[0]?.slug || "news";
  const displayDate =
    article.publishedAt ||
    article.scheduledAt ||
    article.updatedAt ||
    article.createdAt ||
    "";

  return {
    language,
    article: {
      id: String(article.id),
      slug: translation.slug.trim(),
      title: translation.title.trim(),
      summary: translation.summary?.trim() || "",
      content: Array.isArray(translation.content)
        ? translation.content
            .filter(
              (block) =>
                (block.type === "p" || block.type === "h2") &&
                typeof block.text === "string" &&
                block.text.trim(),
            )
            .map((block) => ({
              type: block.type,
              text: block.text.trim(),
            }))
        : [],
      category,
      image: resolveMediaUrl(article.featuredImageUrl),
      imageAlt: translation.imageAlt || translation.title.trim(),
      imageCaption: translation.imageCaption || undefined,
      imagePosition: translation.imagePosition || undefined,
      author:
        translation.authorDisplayName?.trim() ||
        article.authorName?.trim() ||
        "Miracle Times Desk",
      publishedAt: displayDate,
      updatedAt: article.updatedAt || undefined,
      featured: Boolean(article.featured),
      breaking: Boolean(article.breaking),
      tags: article.tags,
      language,
      seoTitle: translation.seoTitle || undefined,
      seoDescription: translation.seoDescription || undefined,
      demoRank: article.demoRank ?? undefined,
    },
  };
}
