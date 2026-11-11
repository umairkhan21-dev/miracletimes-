import { ArchiveIndex } from "@/components/ArchiveIndex";
import { fetchArticles } from "@/lib/api";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { Metadata } from "next";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "संग्रह / Archive",
  description:
    "मिरेकल टाइम्स का समाचार संग्रह — कम से कम दो वर्षों की प्रकाशित खबरें।",
  alternates: { canonical: "/archive/" },
};

export default async function ArchivePage() {
  const { articles, meta } = await fetchArticles({
    language: DEFAULT_LOCALE,
    page: 1,
    limit: 24,
  });

  const years = Array.from(
    new Set(
      articles
        .map((article) => new Date(article.publishedAt).getUTCFullYear())
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => b - a);

  // Ensure at least a rolling two-year archive index exists even with sparse data.
  const nowYear = new Date().getUTCFullYear();
  const guaranteedYears = Array.from(
    new Set([nowYear, nowYear - 1, ...years]),
  ).sort((a, b) => b - a);

  return (
    <ArchiveIndex
      years={guaranteedYears}
      articles={articles}
      total={meta?.total ?? articles.length}
    />
  );
}
