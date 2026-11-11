import {
  loadArticles,
  loadArticlesByCategory,
  selectAdjacent,
  selectLatest,
  selectRelated,
} from "@/lib/content";
import {
  fetchArticleBySlug,
  resolveArticleForLocale,
} from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import type { Article } from "@/lib/types";

export type ArticlePageBundle = {
  article: Article;
  language: Locale;
  related: Article[];
  latest: Article[];
  newer?: Article;
  older?: Article;
};

export async function loadArticleForMetadata(slug: string) {
  const article =
    (await fetchArticleBySlug(slug, "hi").catch(() => null)) ??
    (await fetchArticleBySlug(slug, "en").catch(() => null));
  if (!article) return null;
  const language: Locale = article.language === "en" ? "en" : "hi";
  return { article, language } as const;
}

/**
 * Load the published article plus related/latest/adjacent stories for the
 * slug's language so static export can embed the full body in initial HTML.
 */
export async function loadArticlePageBundle(
  slug: string,
): Promise<ArticlePageBundle | null> {
  const loaded = await loadArticleForMetadata(slug);
  if (!loaded) return null;

  const { article, language } = loaded;
  // Prefer the translation that owns this slug when resolving for locale.
  const resolved =
    (await resolveArticleForLocale(slug, language).catch(() => null)) ?? {
      article,
      canonicalSlug: article.slug,
    };

  const [categoryArticles, allArticles] = await Promise.all([
    loadArticlesByCategory(language, resolved.article.category),
    loadArticles(language),
  ]);
  const { newer, older } = selectAdjacent(categoryArticles, resolved.article);

  return {
    article: resolved.article,
    language,
    related: selectRelated(categoryArticles, resolved.article),
    latest: selectLatest(allArticles, resolved.article.id, 5),
    newer,
    older,
  };
}
