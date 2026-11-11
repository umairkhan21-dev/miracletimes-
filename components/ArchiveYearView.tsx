import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function ArchiveYearView({
  year,
  articles,
  page,
  totalPages,
}: {
  year: number;
  articles: Article[];
  page: number;
  totalPages: number;
}) {
  return (
    <div className="wrap page-block">
      <header className="page-header">
        <p>
          <Link href={demoPath("/archive")}>← संग्रह</Link>
        </p>
        <h1>संग्रह {year}</h1>
        <p>{articles.length} stories on this page.</p>
      </header>

      {!articles.length ? (
        <p>No published stories found for {year} on this page.</p>
      ) : (
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
      )}

      <nav className="archive-pagination" aria-label="Archive pagination">
        {page > 1 ? (
          <Link href={demoPath(`/archive/${year}?page=${page - 1}`)}>
            Previous
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} / {Math.max(1, totalPages)}
        </span>
        {page < totalPages ? (
          <Link href={demoPath(`/archive/${year}?page=${page + 1}`)}>
            Next
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
