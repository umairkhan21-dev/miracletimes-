import { categoryName } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { demoPath } from "@/lib/paths";
import type { Article } from "@/lib/types";
import Link from "next/link";

export function TrendingStories({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;

  return (
    <section className="trending" aria-labelledby="trending-title">
      <header className="section-head">
        <h2 id="trending-title">सबसे ज्यादा पढ़ी गई खबरें</h2>
      </header>
      <p className="trending-note">
        यह क्रम नमूना है। वास्तविक पाठक संख्या या एनालिटिक्स उपलब्ध नहीं हैं, इसलिए इसे
        पढ़े जाने का प्रमाण न मानें।
      </p>
      <ol className="trending-list">
        {articles.map((article, index) => (
          <li key={article.id}>
            <span className="trend-num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>
                <Link href={demoPath(`/news/${article.slug}`)}>{article.title}</Link>
              </h3>
              <p className="meta">
                <Link href={demoPath(`/category/${article.category}`)}>
                  {categoryName(article.category)}
                </Link>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
