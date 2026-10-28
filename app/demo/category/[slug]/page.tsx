import { CategoryPage } from "@/components/CategoryPage";
import { getCategory } from "@/lib/categories";
import { getByCategory } from "@/lib/content";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

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
  return (
    <CategoryPage
      title={category.name}
      description={category.description}
      articles={getByCategory(category.slug)}
      pageSize={2}
    />
  );
}
