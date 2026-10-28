import { ArticleDetail } from "@/components/ArticleDetail";
import { categoryName } from "@/lib/categories";
import { getArticle, getArticles } from "@/lib/content";
import { demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
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
      images: [{ url: article.image, alt: article.imageAlt }],
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return <ArticleDetail article={article} />;
}
