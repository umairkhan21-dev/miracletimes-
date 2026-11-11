# Database indexing & archive recommendations

These recommendations support at least **two years** of Miracle Times articles
with efficient pagination, archive browsing, and dynamic sitemaps. **Do not
apply on production until you approve a change window.** Statements are
idempotent where MySQL supports `IF NOT EXISTS` (8.0+).

## Recommended indexes

```sql
-- Public listing: published_at DESC pagination
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at
  ON articles (status, published_at DESC, id DESC);

-- Featured / breaking shelves
CREATE INDEX IF NOT EXISTS idx_articles_status_featured_published
  ON articles (status, is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status_breaking_published
  ON articles (status, is_breaking, published_at DESC);

-- Slug lookups (per translation)
CREATE INDEX IF NOT EXISTS idx_article_translations_slug_lang
  ON article_translations (slug, language);

-- Category joins for /category/[slug] and homepage shelves
CREATE INDEX IF NOT EXISTS idx_article_categories_category_article
  ON article_categories (category_id, article_id);

-- Archive by calendar year/month (expression index if MySQL 8.0.13+)
-- Alternative: keep published_at range queries with the status+published_at index.
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON articles (published_at);

-- Media cleanup / ownership
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by_created
  ON media (uploaded_by, created_at DESC);
```

## Pagination guidance

| Surface | Strategy |
|---|---|
| Homepage | Bounded fetches (latest ≤40 + per-section ≤8) — never full-table scrape |
| Latest / category | `page` + `limit` (API max 100); UI pages within the loaded window |
| Archive `/archive/[year]` | Year filter + API pagination; add SQL `YEAR(published_at)=?` when ready |
| Sitemap | Paged API (100/page, capped) with ISR + on-demand revalidation |

## Archive support

- Public routes: `/archive/`, `/archive/[year]/` (SSR + ISR)
- Retain published rows indefinitely; prefer `archived` status over hard delete for editorial unpublish when possible
- Plan disk growth for MySQL only (media off-box via S3/R2)

## Growth planning (planning estimates)

| Horizon | Articles (approx.) | Notes |
|---|---|---|
| 2 years | hundreds–low thousands | Current indexes sufficient with pagination |
| 5+ years | tens of thousands | Consider sitemap index chunks + archive year partitions |

## Search note

Current `q=` search uses SQL `LIKE` across title/summary/body. For large
archives, plan a later full-text (`FULLTEXT`) or external search index — out of
scope for the SSR migration.
