import { LocalizedCategoryView } from "@/components/LocalizedCategoryView";
import { getCategory } from "@/lib/categories";
import { loadArticlesByCategory } from "@/lib/content";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 120;
export const dynamicParams = true;

export function generateStaticParams() {
  return [
    "uttar-pradesh",
    "lucknow",
    "politics",
    "national",
    "world",
    "business",
    "education",
    "crime",
    "technology",
    "sports",
    "entertainment",
    "health",
  ].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "श्रेणी नहीं मिली" };
  const canonical = `${category.href.endsWith("/") ? category.href : `${category.href}/`}`;
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical },
    openGraph: {
      title: `${category.name} — Miracle Times`,
      description: category.description,
      url: canonical,
      locale: site.locale,
    },
  };
}

export default async function CategoryRoute({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const articles = await loadArticlesByCategory(DEFAULT_LOCALE, category.slug, {
    limit: 60,
  });

  return (
    <LocalizedCategoryView
      slug={category.slug}
      pageSize={12}
      initialLocale={DEFAULT_LOCALE}
      initialArticles={articles}
    />
  );
}
