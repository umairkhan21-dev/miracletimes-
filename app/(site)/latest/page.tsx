import { LatestPageContent } from "@/components/LatestPageContent";
import { loadLatestArticles } from "@/lib/content";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { Metadata } from "next";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "ताज़ा खबरें",
  description: "मिरेकल टाइम्स की ताज़ा खबरें समय के क्रम में।",
  alternates: { canonical: "/latest/" },
};

export default async function LatestPage() {
  const { articles } = await loadLatestArticles(DEFAULT_LOCALE, { limit: 60 });

  return (
    <LatestPageContent
      initialLocale={DEFAULT_LOCALE}
      initialArticles={articles}
    />
  );
}
