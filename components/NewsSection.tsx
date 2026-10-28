import { ArticleCard } from "@/components/ArticleCard";
import type { HomeSection } from "@/lib/content";
import Link from "next/link";

export function NewsSection({ section }: { section: HomeSection }) {
  const [feature, ...rest] = section.articles;
  if (!feature) return null;

  const variant =
    section.articles.length < 2
      ? "solo"
      : section.articles.length < 3 && section.variant === "rail"
        ? "split"
        : section.variant;

  return (
    <section className="news-section" aria-labelledby={`section-${section.id}`}>
      <header className="section-head">
        <h2 id={`section-${section.id}`}>{section.title}</h2>
        <p className="section-links">
          <Link href={section.href}>सभी खबरें देखें</Link>
          {section.extra ? (
            <Link href={section.extra.href}>{section.extra.label}</Link>
          ) : null}
        </p>
      </header>
      {variant === "text" ? (
        <div className="article-list article-list--text">
          {section.articles.map((article) => (
            <ArticleCard key={article.id} article={article} variant="text" />
          ))}
        </div>
      ) : variant === "rail" ? (
        <ArticleListRail articles={section.articles} />
      ) : (
        <div className={`section-layout section-layout--${variant}`}>
          <ArticleCard article={feature} variant="feature" priority />
          {rest.length ? (
            <div className="section-list">
              {rest.map((article) => (
                <ArticleCard key={article.id} article={article} variant="text" />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ArticleListRail({
  articles,
}: {
  articles: HomeSection["articles"];
}) {
  return (
    <div className="article-list article-list--rail">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} variant="grid" />
      ))}
    </div>
  );
}
