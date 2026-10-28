import { ArticleCard } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { PagedArticleList } from "@/components/PagedArticleList";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import { Suspense } from "react";

export function CategoryPage({
  title,
  description,
  articles,
  crumbs,
  pageSize = 4,
}: {
  title: string;
  description?: string;
  articles: Article[];
  crumbs?: { label: string; href?: string }[];
  pageSize?: number;
}) {
  if (!articles.length) {
    return (
      <div className="wrap page-block">
        <Breadcrumbs
          items={crumbs ?? [{ label: "होम", href: demoPath("/") }, { label: title }]}
        />
        <EmptyState
          title="इस श्रेणी में अभी खबर नहीं है"
          message="जब नई नमूना या संपादकीय खबरें जुड़ेंगी, वे यहाँ क्रम से दिखेंगी।"
          action={{ href: demoPath("/"), label: "होम पर जाएँ" }}
          heading="h1"
        />
      </div>
    );
  }

  const [feature, ...rest] = articles;

  return (
    <div className="wrap page-block">
      <Breadcrumbs
        items={crumbs ?? [{ label: "होम", href: demoPath("/") }, { label: title }]}
      />
      <header className="page-intro">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      {feature ? <ArticleCard article={feature} variant="feature" heading="h2" priority /> : null}
      <section className="feed-section" aria-labelledby="feed-heading">
        <h2 id="feed-heading" className="feed-heading">
          ताज़ा क्रम
        </h2>
        <Suspense fallback={<p className="feed-note">खबरें लोड हो रही हैं…</p>}>
          <PagedArticleList articles={rest} pageSize={pageSize} />
        </Suspense>
      </section>
    </div>
  );
}
