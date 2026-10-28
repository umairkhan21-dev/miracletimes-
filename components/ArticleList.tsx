import { ArticleCard } from "@/components/ArticleCard";
import type { Article } from "@/lib/types";

type ListVariant = "support" | "rail" | "grid" | "feature" | "text" | "row";

export function ArticleList({
  articles,
  variant = "grid",
  heading = "h3",
}: {
  articles: Article[];
  variant?: ListVariant;
  heading?: "h2" | "h3";
}) {
  if (!articles.length) return null;

  if (variant === "rail") {
    return (
      <ol className="rail-list">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant="rail" />
        ))}
      </ol>
    );
  }

  return (
    <div className={`article-list article-list--${variant}`}>
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          variant={variant}
          heading={heading}
          priority={variant === "feature" && index === 0}
        />
      ))}
    </div>
  );
}
