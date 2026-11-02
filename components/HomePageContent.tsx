"use client";

import { ArticleList } from "@/components/ArticleList";
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { LeadStory } from "@/components/LeadStory";
import { NewsSection } from "@/components/NewsSection";
import { TrendingStories } from "@/components/TrendingStories";
import { useI18n } from "@/components/LanguageProvider";
import { navLabel } from "@/lib/categories";
import type { HomeSection } from "@/lib/content";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

type CategoryCount = {
  slug: string;
  name: string;
  english: string;
  href: string;
  count: number;
};

export function HomePageContent({
  lead,
  supporting,
  latestSide,
  fresh,
  sections,
  breaking,
  trending,
  counts,
  jsonLd,
}: {
  lead: Article;
  supporting: Article[];
  latestSide: Article[];
  fresh: Article[];
  sections: HomeSection[];
  breaking: Article[];
  trending: Article[];
  counts: CategoryCount[];
  jsonLd: Record<string, unknown>;
}) {
  const { t, locale } = useI18n();

  return (
    <>
      <BreakingNewsTicker
        items={breaking.map((article) => ({
          slug: article.slug,
          title: article.title,
        }))}
      />
      <div className="wrap home">
        <section className="lead-grid" aria-label={t("a11y.leadStories")}>
          <LeadStory article={lead} />
          <div className="support-col">
            <h2 className="sr-only">{t("a11y.supportingStories")}</h2>
            <ArticleList articles={supporting} variant="support" heading="h2" />
          </div>
          <aside className="latest-col">
            <h2>{t("home.latestUpdates")}</h2>
            <ArticleList articles={latestSide} variant="rail" />
            <div className="pop-cats">
              <h2>{t("home.topCategories")}</h2>
              <ul className="cat-pills">
                {counts.map((category) => (
                  <li key={category.slug}>
                    <Link href={category.href}>
                      {navLabel(category, locale)}
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
            <h2 id="fresh-title">{t("home.latestNews")}</h2>
            <p className="section-links">
              <Link href={demoPath("/latest")}>{t("home.moreStories")}</Link>
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
