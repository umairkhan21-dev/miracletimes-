import { NewsImage } from "@/components/NewsImage";
import { categoryName } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function LeadStory({ article }: { article: Article }) {
  const href = demoPath(`/news/${article.slug}`);
  const name = categoryName(article.category);

  return (
    <article className="lead-story">
      <Link href={href} className="lead-media-link">
        <div className="media media-lead">
          <NewsImage
            src={article.image}
            alt={article.imageAlt}
            priority
            position={article.imagePosition}
            sizes="(max-width: 720px) 100vw, 640px"
          />
        </div>
      </Link>
      <div className="lead-copy">
        <p className="kicker">
          <Link href={demoPath(`/category/${article.category}`)}>{name}</Link>
          <span className="sample-tag">नमूना</span>
        </p>
        <h1 className="lead-title">
          <Link href={href}>{article.title}</Link>
        </h1>
        <p className="lead-summary">{article.summary}</p>
        <p className="meta">
          <time dateTime={article.publishedAt}>{formatDateTime(article.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{article.author}</span>
        </p>
      </div>
    </article>
  );
}
