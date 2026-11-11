import { HomePageLoader } from "@/components/HomePageLoader";
import { loadHomepageBundle } from "@/lib/content";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { absoluteSiteUrl, sitePath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";

// ISR fallback window (seconds); on-demand tags still revalidate immediately.
export const revalidate = 120;

export const metadata: Metadata = {
  alternates: { canonical: sitePath("/") },
};

export default async function HomePage() {
  const bundle = await loadHomepageBundle(DEFAULT_LOCALE).catch(() => null);

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

  return (
    <HomePageLoader
      jsonLd={jsonLd}
      initialLocale={DEFAULT_LOCALE}
      initialBundle={bundle}
    />
  );
}
