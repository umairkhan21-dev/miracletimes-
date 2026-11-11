import type { Locale } from "@/lib/i18n/config";
import type { Article, Category, ContentBlock } from "@/lib/types";

const DEFAULT_API_URL = "http://localhost:4001";

export type ApiMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ApiArticle = Article & {
  numericId?: number;
  categories?: string[];
  status?: string;
  language?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type ApiCategory = Category & {
  id?: number;
  isActive?: boolean;
  displayOrder?: number;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ArticleListParams = {
  language?: Locale;
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
  breaking?: boolean;
  q?: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

type ApiFailure = {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (configured || DEFAULT_API_URL).replace(/\/$/, "");
}

/** True when a real API origin is configured (not the local default). */
export function isApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}

/** Turn relative upload paths into absolute URLs against the API host. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
}

function isContentBlock(value: unknown): value is ContentBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as { type?: unknown; text?: unknown };
  return (
    (block.type === "p" || block.type === "h2") &&
    typeof block.text === "string"
  );
}

function normalizeArticle(raw: ApiArticle): Article {
  const content = Array.isArray(raw.content)
    ? raw.content.filter(isContentBlock)
    : [];

  const seoTitle = typeof raw.seoTitle === "string" ? raw.seoTitle.trim() : "";
  const seoDescription =
    typeof raw.seoDescription === "string" ? raw.seoDescription.trim() : "";

  return {
    id: String(raw.id ?? ""),
    slug: String(raw.slug ?? ""),
    title: String(raw.title ?? ""),
    summary: String(raw.summary ?? ""),
    content,
    category: String(raw.category ?? ""),
    image: resolveMediaUrl(raw.image),
    imageAlt: String(raw.imageAlt ?? ""),
    imageCaption: raw.imageCaption || undefined,
    imagePosition: raw.imagePosition || undefined,
    author: String(raw.author || "Miracle Times Desk"),
    publishedAt: String(raw.publishedAt ?? ""),
    updatedAt: raw.updatedAt || undefined,
    featured: Boolean(raw.featured),
    breaking: Boolean(raw.breaking),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
    language: raw.language || undefined,
    seoTitle: seoTitle || undefined,
    seoDescription: seoDescription || undefined,
    demoRank:
      typeof raw.demoRank === "number" && Number.isFinite(raw.demoRank)
        ? raw.demoRank
        : undefined,
  };
}

function normalizeCategory(raw: ApiCategory): Category {
  return {
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    english: String(raw.english ?? raw.name ?? ""),
    href: `/category/${raw.slug}`,
    description: String(raw.description ?? ""),
  };
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function apiGet<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
  init?: RequestInit,
): Promise<{ data: T; meta?: ApiMeta }> {
  const url = `${getApiBaseUrl()}/api${path}${buildQuery(query)}`;

  // Browser: always fresh. Build/SSR: `force-cache` so `output: "export"` can
  // statically prerender. `scripts/static-export-build.mjs` deletes
  // `.next/cache/fetch-cache` before each export so published slugs/metadata
  // are not reused across builds. Do not switch this to `no-store` — that opts
  // the route into dynamic rendering and breaks static export metadata.
  const defaultCache: RequestCache =
    typeof window === "undefined" ? "force-cache" : "no-store";

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: init?.cache ?? defaultCache,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the news service. Please try again later.",
      0,
      "NETWORK",
    );
  }

  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.success !== true) {
    const failure = body && "error" in body ? body.error : undefined;
    throw new ApiError(
      failure?.message || "The news service returned an unexpected response.",
      response.status,
      failure?.code,
    );
  }

  return { data: body.data, meta: body.meta };
}

export async function fetchArticles(
  params: ArticleListParams = {},
): Promise<{ articles: Article[]; meta?: ApiMeta }> {
  if (!isApiConfigured()) {
    return {
      articles: [],
      meta: { total: 0, page: 1, limit: params.limit ?? 20, totalPages: 0, hasNext: false, hasPrev: false },
    };
  }

  const { data, meta } = await apiGet<ApiArticle[]>("/articles", {
    language: params.language ?? "hi",
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    category: params.category,
    tag: params.tag,
    featured: params.featured,
    breaking: params.breaking,
    q: params.q,
  });

  return {
    articles: (Array.isArray(data) ? data : []).map(normalizeArticle),
    meta,
  };
}

export async function fetchAllArticles(
  params: Omit<ArticleListParams, "page" | "limit"> & { pageSize?: number } = {},
): Promise<Article[]> {
  if (!isApiConfigured()) return [];

  const pageSize = params.pageSize ?? 100;
  const first = await fetchArticles({ ...params, page: 1, limit: pageSize });
  const articles = [...first.articles];
  const totalPages = first.meta?.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchArticles({ ...params, page, limit: pageSize });
    articles.push(...next.articles);
  }

  return articles;
}

export async function fetchArticleBySlug(
  slug: string,
  language: Locale = "hi",
): Promise<Article> {
  if (!isApiConfigured()) {
    throw new ApiError("Article not found", 404, "NOT_FOUND");
  }

  const { data } = await apiGet<ApiArticle>(
    `/articles/${encodeURIComponent(slug)}`,
    { language },
  );
  return normalizeArticle(data);
}

/**
 * Resolve a public article for the active UI language.
 * Hindi/English translations can use different slugs; this helper
 * falls back via shared public id when the slug belongs to the other language.
 */
export async function resolveArticleForLocale(
  slug: string,
  language: Locale,
): Promise<{ article: Article; canonicalSlug: string } | null> {
  let bridge: Article | null = null;
  try {
    bridge = await fetchArticleBySlug(slug, language);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
  }

  if (bridge && bridge.language === language) {
    return { article: bridge, canonicalSlug: bridge.slug };
  }

  // Slug may belong to the other language (API resolves by slug).
  // Find the sibling translation for the requested UI language.
  const publicId = bridge?.id;
  if (!publicId) return null;

  const { articles } = await fetchArticles({
    language,
    limit: 100,
  });
  const match = articles.find((item) => item.id === publicId);
  if (!match) return null;

  // List payloads omit content blocks — load the canonical translation.
  const article = await fetchArticleBySlug(match.slug, language);
  return { article, canonicalSlug: article.slug };
}

export async function fetchFeaturedArticles(
  language: Locale = "hi",
  limit = 10,
): Promise<Article[]> {
  if (!isApiConfigured()) return [];
  const { data } = await apiGet<ApiArticle[]>("/articles/featured", {
    language,
    limit,
  });
  return (Array.isArray(data) ? data : []).map(normalizeArticle);
}

export async function fetchBreakingArticles(
  language: Locale = "hi",
  limit = 8,
): Promise<Article[]> {
  if (!isApiConfigured()) return [];
  const { data } = await apiGet<ApiArticle[]>("/articles/breaking", {
    language,
    limit,
  });
  return (Array.isArray(data) ? data : []).map(normalizeArticle);
}

export async function fetchTrendingArticles(
  language: Locale = "hi",
  limit = 8,
): Promise<Article[]> {
  if (!isApiConfigured()) return [];
  const { data } = await apiGet<ApiArticle[]>("/articles/trending", {
    language,
    limit,
  });
  return (Array.isArray(data) ? data : []).map(normalizeArticle);
}

export async function fetchCategories(
  language: Locale = "hi",
): Promise<Category[]> {
  if (!isApiConfigured()) return [];
  const { data } = await apiGet<ApiCategory[]>("/categories", { language });
  return (Array.isArray(data) ? data : []).map(normalizeCategory);
}

export async function fetchCategoryBySlug(
  slug: string,
  language: Locale = "hi",
): Promise<Category> {
  if (!isApiConfigured()) {
    throw new ApiError("Category not found", 404, "NOT_FOUND");
  }
  const { data } = await apiGet<ApiCategory>(
    `/categories/${encodeURIComponent(slug)}`,
    { language },
  );
  return normalizeCategory(data);
}

/** Collect published slugs for both languages (static export paths). */
export async function fetchPublishedSlugs(): Promise<string[]> {
  if (!isApiConfigured()) return [];

  const [hiArticles, enArticles] = await Promise.all([
    fetchAllArticles({ language: "hi" }),
    fetchAllArticles({ language: "en" }),
  ]);
  return Array.from(
    new Set(
      [...hiArticles, ...enArticles]
        .map((article) => article.slug)
        .filter(Boolean),
    ),
  );
}
