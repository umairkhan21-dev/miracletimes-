import { categories, infoLinks } from "@/lib/categories";
import { getArticles } from "@/lib/content";
import { demoAbsoluteUrl } from "@/lib/paths";
import { site } from "@/lib/site";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

function absoluteHref(href: string): string {
  const origin = site.url.replace(/\/$/, "");
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${origin}${path.endsWith("/") ? path : `${path}/`}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticles();
  const lastArticle = articles[0]?.publishedAt;

  return [
    {
      url: `${site.url}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: demoAbsoluteUrl(site.url, "/"),
      lastModified: lastArticle,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: demoAbsoluteUrl(site.url, "/latest"),
      lastModified: lastArticle,
      changeFrequency: "weekly",
      priority: 0.3,
    },
    ...categories.map((category) => ({
      url: absoluteHref(category.href),
      changeFrequency: "weekly" as const,
      priority: 0.3,
    })),
    ...infoLinks.map((link) => ({
      url: absoluteHref(link.href),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...articles.map((article) => ({
      url: demoAbsoluteUrl(site.url, `/news/${article.slug}`),
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.2,
    })),
  ];
}
