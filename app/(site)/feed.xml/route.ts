import { fetchAllArticles } from "@/lib/api";
import { categoryName } from "@/lib/categories";
import type { Locale } from "@/lib/i18n/config";
import { absoluteSiteUrl } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Article } from "@/lib/types";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Combined Hindi + English RSS feed at the existing /feed.xml URL.
 * Items keep their language via the slug's translation and a category hint.
 */
export async function GET() {
  let articles: Article[] = [];
  try {
    const [hiArticles, enArticles] = await Promise.all([
      fetchAllArticles({ language: "hi" }),
      fetchAllArticles({ language: "en" }),
    ]);
    const seen = new Set<string>();
    articles = [...hiArticles, ...enArticles]
      .filter((article) => {
        if (!article.slug || seen.has(article.slug)) return false;
        seen.add(article.slug);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  } catch (error) {
    console.warn(
      "RSS feed could not load articles from API:",
      error instanceof Error ? error.message : error,
    );
  }

  const items = articles
    .slice(0, 40)
    .map((article) => {
      const link = absoluteSiteUrl(site.url, `/news/${article.slug}`);
      const locale = (article.language === "en" ? "en" : "hi") as Locale;
      const languageLabel = locale === "en" ? "English" : "Hindi";
      return `<item>
        <title>${escapeXml(article.title)}</title>
        <link>${link}</link>
        <guid isPermaLink="true">${link}</guid>
        <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(article.summary)}</description>
        <category>${escapeXml(categoryName(article.category, locale))}</category>
        <category>${escapeXml(languageLabel)}</category>
      </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${absoluteSiteUrl(site.url, "/")}</link>
    <description>${escapeXml(site.description)}</description>
    <language>hi</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
