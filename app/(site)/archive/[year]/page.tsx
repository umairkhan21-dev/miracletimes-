import { ArchiveYearView } from "@/components/ArchiveYearView";
import { fetchArticles } from "@/lib/api";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
};

export const revalidate = 120;
export const dynamicParams = true;

export async function generateStaticParams() {
  const now = new Date().getUTCFullYear();
  return [now, now - 1].map((year) => ({ year: String(year) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `संग्रह ${year}`,
    description: `Miracle Times archive for ${year}.`,
    alternates: { canonical: `/archive/${year}/` },
  };
}

export default async function ArchiveYearPage({ params, searchParams }: Props) {
  const { year: yearRaw } = await params;
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    notFound();
  }

  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);

  // Fetch a page from the API; filter to the requested year for the view.
  // Dedicated year/month SQL filters are documented in docs/DATABASE_INDEXES.md.
  const { articles, meta } = await fetchArticles({
    language: DEFAULT_LOCALE,
    page,
    limit: 100,
  });
  const filtered = articles.filter((article) => {
    const date = new Date(article.publishedAt);
    return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year;
  });

  return (
    <ArchiveYearView
      year={year}
      articles={filtered}
      page={page}
      totalPages={meta?.totalPages ?? 1}
    />
  );
}
