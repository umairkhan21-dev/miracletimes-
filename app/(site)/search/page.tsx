import { SearchInterface } from "@/components/SearchInterface";
import { SearchPageFallback } from "@/components/SearchPageFallback";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "खोज",
  description: "मिरेकल टाइम्स की नमूना खबरों में हिंदी या अंग्रेज़ी खोज।",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search/" },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchInterface />
    </Suspense>
  );
}
