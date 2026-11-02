import { fetchAllArticles } from "@/lib/api";
import { categoryName } from "@/lib/categories";
import { absoluteSiteUrl } from "@/lib/paths";
import { site } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET() {
  let articles: Awaited<ReturnType<typeof fetchAllArticles>> = [];
  try {
    articles = await fetchAllArticles({ language: "hi" });
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
      return `<item>
        <title>${escapeXml(article.title)}</title>
        <link>${link}</link>
        <guid>${link}</guid>
        <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(article.summary)}</description>
        <category>${escapeXml(categoryName(article.category))}</category>
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
