import { articles as demoArticles } from "@/lib/articles";
import type { Locale } from "@/lib/i18n/config";
import type { Article } from "@/lib/types";

/**
 * Temporary frontend-only demo corpus for client UI review (Vercel).
 * Prefer live API articles when any exist; fall back to this set when the
 * API is empty or unreachable. Remove this wiring after real news is published
 * from the admin panel.
 */
export function getDemoArticles(_language?: Locale): Article[] {
  // Corpus is Hindi; still surface it for both UI languages during review.
  return demoArticles.map((article) => ({
    ...article,
    language: article.language ?? "hi",
  }));
}

export function findDemoArticle(slug: string): Article | undefined {
  return getDemoArticles().find((article) => article.slug === slug);
}

export function getDemoSlugs(): string[] {
  return getDemoArticles().map((article) => article.slug);
}

export function filterDemoByCategory(categorySlug: string): Article[] {
  return getDemoArticles()
    .filter((article) => article.category === categorySlug)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}
