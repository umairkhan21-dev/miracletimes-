import { ArticleDetail } from "@/components/ArticleDetail";
import { fetchArticleBySlug, fetchPublishedSlugs } from "@/lib/api";
import { categoryName } from "@/lib/categories";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const slugs = await fetchPublishedSlugs();
    if (slugs.length) {
      return slugs.map((slug) => ({ slug }));
    }
  } catch (error) {
    console.warn(
      "Could not load article slugs from API during build:",
      error instanceof Error ? error.message : error,
    );
  }

  // Keep export buildable when the API is offline; client fetch still runs.
  return [
    { slug: "agra-virasat-yatayat-namuna" },
    { slug: "agra-heritage-traffic-sample" },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article =
      (await fetchArticleBySlug(slug, "hi").catch(() => null)) ??
      (await fetchArticleBySlug(slug, "en").catch(() => null));

    if (!article) return { title: "खबर नहीं मिली" };

    const name = categoryName(article.category);
    const path = demoPath(`/news/${article.slug}`);
    return {
      title: article.title,
      description: article.summary,
      authors: [{ name: article.author }],
      alternates: { canonical: `${path}/` },
      openGraph: {
        type: "article",
        title: article.title,
        description: article.summary,
        url: `${path}/`,
        publishedTime: article.publishedAt,
        modifiedTime: article.updatedAt ?? article.publishedAt,
        section: name,
        authors: [article.author],
        locale: site.locale,
        ...(article.image
          ? { images: [{ url: article.image, alt: article.imageAlt }] }
          : {}),
      },
    };
  } catch {
    return { title: "खबर नहीं मिली" };
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  return <ArticleDetail slug={slug} />;
}
