import { NewsImage } from "@/components/NewsImage";
import { categoryName } from "@/lib/categories";
import { formatDateTime, formatTime } from "@/lib/format";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

type CardVariant = "support" | "rail" | "grid" | "feature" | "text" | "row";
type Heading = "h2" | "h3";

function Meta({ article, withTime = true }: { article: Article; withTime?: boolean }) {
  return (
    <p className="meta">
      <time dateTime={article.publishedAt}>
        {withTime ? formatDateTime(article.publishedAt) : formatTime(article.publishedAt)}
      </time>
      <span aria-hidden="true">·</span>
      <span>{article.author}</span>
    </p>
  );
}

export function ArticleCard({
  article,
  variant = "grid",
  heading = "h3",
  priority = false,
}: {
  article: Article;
  variant?: CardVariant;
  heading?: Heading;
  priority?: boolean;
}) {
  const Title = heading;
  const href = demoPath(`/news/${article.slug}`);
  const categoryHref = demoPath(`/category/${article.category}`);
  const name = categoryName(article.category);

  if (variant === "rail") {
    return (
      <li className="rail-item">
        <time dateTime={article.publishedAt}>{formatTime(article.publishedAt)}</time>
        <div>
          <Link href={href}>{article.title}</Link>
          <span className="rail-cat">{name}</span>
        </div>
      </li>
    );
  }

  if (variant === "text") {
    return (
      <article className="text-item">
        <Link href={href} className="text-media-link" tabIndex={-1} aria-hidden="true">
          <div className="media media-square text-media">
            <NewsImage
              src={article.image}
              alt=""
              position={article.imagePosition}
              sizes="88px"
            />
          </div>
        </Link>
        <div>
          <p className="kicker">
            <Link href={categoryHref}>{name}</Link>
            <span className="sample-tag">नमूना</span>
          </p>
          <Title>
            <Link href={href}>{article.title}</Link>
          </Title>
          <time className="meta" dateTime={article.publishedAt}>
            {formatDateTime(article.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  if (variant === "support") {
    return (
      <article className="support-card">
        <Link href={href} className="support-media-link" tabIndex={-1} aria-hidden="true">
          <div className="media media-4x3">
            <NewsImage
              src={article.image}
              alt=""
              position={article.imagePosition}
              sizes="(max-width: 720px) 112px, 168px"
            />
          </div>
        </Link>
        <div>
          <p className="kicker">
            <Link href={categoryHref}>{name}</Link>
          </p>
          <Title>
            <Link href={href}>{article.title}</Link>
          </Title>
          <time className="meta" dateTime={article.publishedAt}>
            {formatDateTime(article.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  const mediaClass = variant === "row" ? "media media-4x3 row-media" : "media media-16x9";

  return (
    <article className={`story-card story-card--${variant}`}>
      <Link href={href} className="card-media-link" tabIndex={-1} aria-hidden="true">
        <div className={mediaClass}>
          <NewsImage
            src={article.image}
            alt=""
            priority={priority}
            position={article.imagePosition}
            sizes={
              variant === "feature"
                ? "(max-width: 800px) 100vw, 560px"
                : "(max-width: 720px) 100vw, 360px"
            }
          />
        </div>
      </Link>
      <div className="card-body">
        <p className="kicker">
          <Link href={categoryHref}>{name}</Link>
          <span className="sample-tag">नमूना</span>
        </p>
        <Title className="card-title">
          <Link href={href}>{article.title}</Link>
        </Title>
        {variant !== "grid" || article.summary ? (
          <p className="card-summary">{article.summary}</p>
        ) : null}
        <Meta article={article} />
      </div>
    </article>
  );
}
