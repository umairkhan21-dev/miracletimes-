import { HomePageLoader } from "@/components/HomePageLoader";
import { absoluteSiteUrl, sitePath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: sitePath("/") },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absoluteSiteUrl(site.url, "/"),
    inLanguage: "hi",
    description: site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteSiteUrl(site.url, "/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <HomePageLoader jsonLd={jsonLd} />;
}
