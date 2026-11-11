/**
 * Next.js cache tags for selective ISR / on-demand revalidation.
 * Express calls POST /api/revalidate with these tags after public article mutations.
 */
export const CACHE_TAGS = {
  home: "home",
  articles: "articles",
  sitemap: "sitemap",
  feed: "feed",
  latest: "latest",
  article: (slug: string) => `article:${slug}`,
  category: (slug: string) => `category:${slug}`,
} as const;

/** Default ISR window (seconds) when tag revalidation has not yet fired. */
export const REVALIDATE_SECONDS = {
  home: 120,
  listing: 120,
  article: 300,
  sitemap: 3600,
  feed: 600,
} as const;

export function publicContentTags(extra: string[] = []): string[] {
  return [
    CACHE_TAGS.home,
    CACHE_TAGS.articles,
    CACHE_TAGS.latest,
    CACHE_TAGS.sitemap,
    CACHE_TAGS.feed,
    ...extra,
  ];
}
