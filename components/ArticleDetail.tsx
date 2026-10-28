import { ArticleList } from "@/components/ArticleList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsImage } from "@/components/NewsImage";
import { ShareButtons } from "@/components/ShareButtons";
import { categoryName } from "@/lib/categories";
import { getAdjacent, getLatest, getRelated } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { demoAbsoluteUrl, demoPath } from "@/lib/paths";
import { site } from "@/lib/site";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function ArticleDetail({ article }: { article: Article }) {
  const name = categoryName(article.category);
  const categoryHref = demoPath(`/category/${article.category}`);
  const related = getRelated(article);
  const latest = getLatest(article.id, 5);
  const { newer, older } = getAdjacent(article);
  const url = demoAbsoluteUrl(site.url, `/news/${article.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: "hi",
    articleSection: name,
    image: [`${site.url}${article.image}`],
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}/mark.png`,
      },
    },
    mainEntityOfPage: url,
    isBasedOn: site.sampleNotice,
  };

  return (
    <article className="wrap article-page">
      <Breadcrumbs
        items={[
          { label: "होम", href: demoPath("/") },
          { label: name, href: categoryHref },
          { label: article.title },
        ]}
      />
      <header className="story-header">
        <p className="kicker">
          <Link href={categoryHref}>{name}</Link>
          <span className="sample-tag">नमूना</span>
        </p>
        <h1>{article.title}</h1>
        <p className="story-dek">{article.summary}</p>
        <p className="meta story-meta">
          <span>{article.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>
            प्रकाशित: {formatDateTime(article.publishedAt)}
          </time>
          {article.updatedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={article.updatedAt}>
                अपडेट: {formatDateTime(article.updatedAt)}
              </time>
            </>
          ) : null}
        </p>
        <ShareButtons title={article.title} summary={article.summary} path={url} />
      </header>

      <figure className="story-figure">
        <div className="media media-lead">
          <NewsImage
            src={article.image}
            alt={article.imageAlt}
            priority
            position={article.imagePosition}
            sizes="(max-width: 760px) 100vw, 760px"
          />
        </div>
        {article.imageCaption ? <figcaption>{article.imageCaption}</figcaption> : null}
      </figure>

      <p className="sample-note">
        यह रिपोर्ट नमूना सामग्री है। इसे सत्यापित समाचार, आधिकारिक बयान या चिकित्सकीय सलाह न समझें।
      </p>

      <div className="story-body">
        {article.content.map((block, index) =>
          block.type === "h2" ? (
            <h2 key={`${article.id}-h-${index}`}>{block.text}</h2>
          ) : (
            <p key={`${article.id}-p-${index}`}>{block.text}</p>
          ),
        )}
      </div>

      <p className="story-back">
        <Link href={categoryHref}>{name} की सभी खबरें</Link>
        <Link href={demoPath("/")}>होम</Link>
      </p>

      {older || newer ? (
        <nav className="story-pager" aria-label="पिछली और अगली खबर">
          {older ? (
            <Link href={demoPath(`/news/${older.slug}`)} className="story-pager-link">
              <span>पिछली खबर</span>
              <strong>{older.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={demoPath(`/news/${newer.slug}`)} className="story-pager-link is-next">
              <span>अगली खबर</span>
              <strong>{newer.title}</strong>
            </Link>
          ) : null}
        </nav>
      ) : null}

      {related.length ? (
        <section className="story-more" aria-labelledby="related-title">
          <h2 id="related-title">इसी श्रेणी से</h2>
          <ArticleList articles={related} variant="row" />
        </section>
      ) : null}

      {latest.length ? (
        <section className="story-more" aria-labelledby="latest-title">
          <h2 id="latest-title">ताज़ा खबरें</h2>
          <ArticleList articles={latest} variant="text" />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
