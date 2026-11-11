import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function ArchiveIndex({
  years,
  articles,
  total,
}: {
  years: number[];
  articles: Article[];
  total: number;
}) {
  return (
    <div className="wrap page-block">
      <header className="page-header">
        <h1>संग्रह / Archive</h1>
        <p>
          Published stories across at least two years. Currently indexed:{" "}
          {total.toLocaleString("en-IN")} articles.
        </p>
      </header>

      <section aria-label="Archive years">
        <ul className="archive-year-list">
          {years.map((year) => (
            <li key={year}>
              <Link href={demoPath(`/archive/${year}`)}>{year}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Recent archive stories">
        <h2>Recent</h2>
        <ul className="archive-story-list">
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={demoPath(`/news/${article.slug}`)}>
                {article.title}
              </Link>
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("hi-IN")}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
