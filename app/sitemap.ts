import { fetchAllArticles } from "@/lib/api";
import { categories, infoLinks } from "@/lib/categories";
import { absoluteSiteUrl } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Article } from "@/lib/types";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

function absoluteHref(href: string): string {
  const origin = site.url.replace(/\/$/, "");
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${origin}${path.endsWith("/") ? path : `${path}/`}`;
}

function uniqueBySlug(items: Article[]): Article[] {
  const seen = new Set<string>();
  return items.filter((article) => {
    if (!article.slug || seen.has(article.slug)) return false;
    seen.add(article.slug);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: Article[] = [];
  try {
    const [hiArticles, enArticles] = await Promise.all([
      fetchAllArticles({ language: "hi" }),
      fetchAllArticles({ language: "en" }),
    ]);
    articles = uniqueBySlug([...hiArticles, ...enArticles]);
  } catch (error) {
    console.warn(
      "Sitemap could not load articles from API:",
      error instanceof Error ? error.message : error,
    );
  }

  const lastArticle = articles[0]?.publishedAt;

  return [
    {
      url: absoluteSiteUrl(site.url, "/"),
      lastModified: lastArticle,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteSiteUrl(site.url, "/latest"),
      lastModified: lastArticle,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    ...categories.map((category) => ({
      url: absoluteHref(category.href),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...infoLinks.map((link) => ({
      url: absoluteHref(link.href),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...articles.map((article) => ({
      url: absoluteSiteUrl(site.url, `/news/${article.slug}`),
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
