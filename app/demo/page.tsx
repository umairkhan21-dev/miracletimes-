import { ArticleList } from "@/components/ArticleList";
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { LeadStory } from "@/components/LeadStory";
import { NewsSection } from "@/components/NewsSection";
import { TrendingStories } from "@/components/TrendingStories";
import { categoryCounts, getBreaking, getHomepage, getTrending } from "@/lib/content";
import { demoAbsoluteUrl, demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: demoPath("/") },
};

export default function DemoHomePage() {
  const { lead, supporting, latestSide, fresh, sections } = getHomepage();
  const breaking = getBreaking();
  const trending = getTrending();
  const counts = categoryCounts().slice(0, 6);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: demoAbsoluteUrl(site.url, "/"),
    inLanguage: "hi",
    description: site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${demoAbsoluteUrl(site.url, "/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <BreakingNewsTicker
        items={breaking.map((article) => ({ slug: article.slug, title: article.title }))}
      />
      <div className="wrap home">
        <section className="lead-grid" aria-label="प्रमुख खबरें">
          <LeadStory article={lead} />
          <div className="support-col">
            <h2 className="sr-only">सहायक खबरें</h2>
            <ArticleList articles={supporting} variant="support" heading="h2" />
          </div>
          <aside className="latest-col">
            <h2>ताज़ा अपडेट</h2>
            <ArticleList articles={latestSide} variant="rail" />
            <div className="pop-cats">
              <h2>प्रमुख श्रेणियाँ</h2>
              <ul className="cat-pills">
                {counts.map((category) => (
                  <li key={category.slug}>
                    <Link href={category.href}>
                      {category.name}
                      <span className="pill-count">{category.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <section className="fresh-section" aria-labelledby="fresh-title">
          <header className="section-head">
            <h2 id="fresh-title">ताज़ा खबरें</h2>
            <p className="section-links">
              <Link href={demoPath("/latest")}>और खबरें देखें</Link>
            </p>
          </header>
          <ArticleList articles={fresh} variant="grid" />
        </section>

        {sections.map((section) => (
          <NewsSection key={section.id} section={section} />
        ))}

        <TrendingStories articles={trending} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
