import { articles } from "@/lib/articles";
import { categories, categoryName, getCategory } from "@/lib/categories";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";

export type SectionVariant = "feature" | "split" | "rail" | "text";

export type HomeSection = {
  id: string;
  title: string;
  href: string;
  variant: SectionVariant;
  articles: Article[];
  extra?: { href: string; label: string };
};

const sectionDefs: Array<{
  id: string;
  title: string;
  href: string;
  categories: string[];
  variant: SectionVariant;
  extra?: { href: string; label: string };
}> = [
  {
    id: "up",
    title: "उत्तर प्रदेश समाचार",
    href: demoPath("/category/uttar-pradesh"),
    categories: ["uttar-pradesh"],
    variant: "feature",
  },
  {
    id: "lucknow",
    title: "लखनऊ समाचार",
    href: demoPath("/category/lucknow"),
    categories: ["lucknow"],
    variant: "split",
  },
  {
    id: "politics",
    title: "राजनीति",
    href: demoPath("/category/politics"),
    categories: ["politics"],
    variant: "text",
  },
  {
    id: "desh",
    title: "देश-दुनिया",
    href: demoPath("/category/national"),
    categories: ["national", "world"],
    variant: "split",
    extra: { href: demoPath("/category/world"), label: "दुनिया की खबरें" },
  },
  {
    id: "business",
    title: "कारोबार और अर्थव्यवस्था",
    href: demoPath("/category/business"),
    categories: ["business"],
    variant: "feature",
  },
  {
    id: "education",
    title: "शिक्षा और रोजगार",
    href: demoPath("/category/education"),
    categories: ["education"],
    variant: "rail",
  },
  {
    id: "crime",
    title: "अपराध",
    href: demoPath("/category/crime"),
    categories: ["crime"],
    variant: "text",
  },
  {
    id: "technology",
    title: "टेक्नोलॉजी",
    href: demoPath("/category/technology"),
    categories: ["technology"],
    variant: "split",
  },
  {
    id: "sports",
    title: "खेल",
    href: demoPath("/category/sports"),
    categories: ["sports"],
    variant: "rail",
  },
  {
    id: "entertainment",
    title: "मनोरंजन",
    href: demoPath("/category/entertainment"),
    categories: ["entertainment"],
    variant: "feature",
  },
  {
    id: "health",
    title: "स्वास्थ्य",
    href: demoPath("/category/health"),
    categories: ["health"],
    variant: "text",
  },
];

export function getArticles() {
  return [...articles].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
}

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getByCategory(slug: string) {
  return getArticles().filter((article) => article.category === slug);
}

export function getBreaking(limit = 8) {
  return getArticles()
    .filter((article) => article.breaking)
    .slice(0, limit);
}

export function getTrending() {
  return articles
    .filter((article) => typeof article.demoRank === "number")
    .sort((a, b) => (a.demoRank ?? 99) - (b.demoRank ?? 99));
}

export function getRelated(article: Article, limit = 3) {
  return getByCategory(article.category)
    .filter((item) => item.id !== article.id)
    .slice(0, limit);
}

export function getLatest(excludeId?: string, limit = 5) {
  return getArticles()
    .filter((article) => article.id !== excludeId)
    .slice(0, limit);
}

export function getAdjacent(article: Article) {
  const list = getByCategory(article.category);
  const index = list.findIndex((item) => item.id === article.id);
  if (index < 0) return { newer: undefined, older: undefined };
  return {
    newer: index > 0 ? list[index - 1] : undefined,
    older: index < list.length - 1 ? list[index + 1] : undefined,
  };
}

export function categoryCounts() {
  return categories
    .map((category) => ({
      ...category,
      count: articles.filter((article) => article.category === category.slug)
        .length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count);
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

export function getHomepage() {
  const all = getArticles();
  const used = new Set<string>();
  const featured = all.filter((article) => article.featured);
  const lead = take(featured.length ? featured : all, used, 1)[0];
  if (!lead) {
    throw new Error("Homepage requires at least one sample article.");
  }

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
        title: section.title,
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

/**
 * Searches the local demo dataset. Swap this function for a backend query
 * later; pages only depend on the returned articles.
 */
export function searchArticles(query: string) {
  const tokens = normalizeQuery(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  return getArticles().filter((article) => {
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
