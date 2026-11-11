import {
  fetchAllArticles,
  fetchArticles,
  fetchBreakingArticles,
  fetchTrendingArticles,
} from "@/lib/api";
import { categories, categoryName, getCategory } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/config";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";

export type SectionVariant = "feature" | "split" | "rail" | "text";

export type HomeSection = {
  id: string;
  titleKey:
    | "section.up"
    | "section.lucknow"
    | "section.politics"
    | "section.desh"
    | "section.business"
    | "section.education"
    | "section.crime"
    | "section.technology"
    | "section.sports"
    | "section.entertainment"
    | "section.health";
  href: string;
  variant: SectionVariant;
  articles: Article[];
  extra?: { href: string; labelKey: "section.deshExtra" };
};

export type HomepageData = {
  lead: Article | null;
  supporting: Article[];
  latestSide: Article[];
  fresh: Article[];
  sections: HomeSection[];
};

export type CategoryCount = {
  slug: string;
  name: string;
  english: string;
  href: string;
  description: string;
  count: number;
};

const sectionDefs: Array<{
  id: string;
  titleKey: HomeSection["titleKey"];
  href: string;
  categories: string[];
  variant: SectionVariant;
  extra?: { href: string; labelKey: "section.deshExtra" };
}> = [
  {
    id: "up",
    titleKey: "section.up",
    href: demoPath("/category/uttar-pradesh"),
    categories: ["uttar-pradesh"],
    variant: "feature",
  },
  {
    id: "lucknow",
    titleKey: "section.lucknow",
    href: demoPath("/category/lucknow"),
    categories: ["lucknow"],
    variant: "split",
  },
  {
    id: "politics",
    titleKey: "section.politics",
    href: demoPath("/category/politics"),
    categories: ["politics"],
    variant: "text",
  },
  {
    id: "desh",
    titleKey: "section.desh",
    href: demoPath("/category/national"),
    categories: ["national", "world"],
    variant: "split",
    extra: { href: demoPath("/category/world"), labelKey: "section.deshExtra" },
  },
  {
    id: "business",
    titleKey: "section.business",
    href: demoPath("/category/business"),
    categories: ["business"],
    variant: "feature",
  },
  {
    id: "education",
    titleKey: "section.education",
    href: demoPath("/category/education"),
    categories: ["education"],
    variant: "rail",
  },
  {
    id: "crime",
    titleKey: "section.crime",
    href: demoPath("/category/crime"),
    categories: ["crime"],
    variant: "text",
  },
  {
    id: "technology",
    titleKey: "section.technology",
    href: demoPath("/category/technology"),
    categories: ["technology"],
    variant: "split",
  },
  {
    id: "sports",
    titleKey: "section.sports",
    href: demoPath("/category/sports"),
    categories: ["sports"],
    variant: "rail",
  },
  {
    id: "entertainment",
    titleKey: "section.entertainment",
    href: demoPath("/category/entertainment"),
    categories: ["entertainment"],
    variant: "feature",
  },
  {
    id: "health",
    titleKey: "section.health",
    href: demoPath("/category/health"),
    categories: ["health"],
    variant: "text",
  },
];

function sortByPublishedDesc(articles: Article[]) {
  return [...articles].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
}

function take(source: Article[], used: Set<string>, count: number) {
  const picked: Article[] = [];
  for (const article of source) {
    if (used.has(article.id)) continue;
    used.add(article.id);
    picked.push(article);
    if (picked.length === count) break;
  }
  return picked;
}

export function sortArticles(articles: Article[]) {
  return sortByPublishedDesc(articles);
}

export function findArticle(articles: Article[], slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function filterByCategory(articles: Article[], slug: string) {
  return sortByPublishedDesc(
    articles.filter((article) => article.category === slug),
  );
}

export function selectBreaking(articles: Article[], limit = 8) {
  return sortByPublishedDesc(articles)
    .filter((article) => article.breaking)
    .slice(0, limit);
}

export function selectTrending(articles: Article[]) {
  return articles
    .filter((article) => typeof article.demoRank === "number")
    .sort((a, b) => (a.demoRank ?? 99) - (b.demoRank ?? 99));
}

export function selectRelated(articles: Article[], article: Article, limit = 3) {
  return filterByCategory(articles, article.category)
    .filter((item) => item.id !== article.id)
    .slice(0, limit);
}

export function selectLatest(
  articles: Article[],
  excludeId?: string,
  limit = 5,
) {
  return sortByPublishedDesc(articles)
    .filter((article) => article.id !== excludeId)
    .slice(0, limit);
}

export function selectAdjacent(articles: Article[], article: Article) {
  const list = filterByCategory(articles, article.category);
  const index = list.findIndex((item) => item.id === article.id);
  if (index < 0) return { newer: undefined, older: undefined };
  return {
    newer: index > 0 ? list[index - 1] : undefined,
    older: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function buildCategoryCounts(articles: Article[]): CategoryCount[] {
  return categories
    .map((category) => ({
      ...category,
      count: articles.filter((article) => article.category === category.slug)
        .length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function buildHomepage(articles: Article[]): HomepageData {
  const all = sortByPublishedDesc(articles);
  const used = new Set<string>();
  const featured = all.filter((article) => article.featured);
  const lead = take(featured.length ? featured : all, used, 1)[0] ?? null;

  const supporting = take(all, used, 3);
  const latestSide = take(all, used, 5);
  const fresh = take(all, used, 4);
  const sections: HomeSection[] = sectionDefs
    .map((section) => {
      const pool = all.filter(
        (article) =>
          section.categories.includes(article.category) && !used.has(article.id),
      );
      const visible = pool.slice(0, 4);
      visible.forEach((article) => used.add(article.id));
      return {
        id: section.id,
        titleKey: section.titleKey,
        href: section.href,
        variant: section.variant,
        extra: section.extra,
        articles: visible,
      };
    })
    .filter((section) => section.articles.length > 0);

  return { lead, supporting, latestSide, fresh, sections };
}

export function normalizeQuery(value: string) {
  return value.normalize("NFC").trim().toLowerCase();
}

/** Local filter used when a full article list is already in memory. */
export function filterArticlesByQuery(articles: Article[], query: string) {
  const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  return sortByPublishedDesc(articles).filter((article) => {
    const category = getCategory(article.category);
    const haystack = normalizeQuery(
      [
        article.title,
        article.summary,
        article.author,
        article.tags?.join(" "),
        category?.name,
        category?.english,
        categoryName(article.category),
        ...article.content.map((block) => block.text),
      ].join(" "),
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

export async function loadArticles(language: Locale): Promise<Article[]> {
  try {
    return await fetchAllArticles({ language });
  } catch {
    return [];
  }
}

export async function loadHomepageBundle(language: Locale) {
  let articles: Article[] = [];
  let breaking: Article[] = [];
  let trending: Article[] = [];

  try {
    [articles, breaking, trending] = await Promise.all([
      fetchAllArticles({ language }),
      fetchBreakingArticles(language, 8),
      fetchTrendingArticles(language, 8),
    ]);
  } catch {
    articles = [];
    breaking = [];
    trending = [];
  }

  const homepage = buildHomepage(articles);
  return {
    ...homepage,
    breaking: breaking.length ? breaking : selectBreaking(articles),
    trending: trending.length ? trending : selectTrending(articles),
    counts: buildCategoryCounts(articles).slice(0, 6),
    articles,
  };
}

export async function loadArticlesByCategory(
  language: Locale,
  categorySlug: string,
) {
  try {
    return await fetchAllArticles({ language, category: categorySlug });
  } catch {
    return [];
  }
}

export async function searchArticlesRemote(language: Locale, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { articles } = await fetchArticles({
      language,
      q: trimmed,
      limit: 50,
    });
    return articles;
  } catch {
    return [];
  }
}
