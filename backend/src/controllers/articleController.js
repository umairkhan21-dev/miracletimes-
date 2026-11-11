const articleService = require("../services/articleService");
const cacheRevalidateService = require("../services/cacheRevalidateService");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

function collectSlugs(article) {
  if (!article) return [];
  const slugs = new Set();
  if (article.slug) slugs.add(article.slug);
  if (Array.isArray(article.translations)) {
    for (const translation of article.translations) {
      if (translation?.slug) slugs.add(translation.slug);
    }
  }
  return Array.from(slugs);
}

function collectCategories(article) {
  if (!article) return [];
  if (Array.isArray(article.categories) && article.categories.length) {
    return article.categories.map(String).filter(Boolean);
  }
  if (article.category) return [String(article.category)];
  return [];
}

function queuePublicRevalidation(
  reason,
  previousStatus,
  nextStatus,
  action,
  articles = [],
) {
  if (
    !cacheRevalidateService.shouldRevalidateForArticle({
      previousStatus,
      nextStatus,
      action,
    })
  ) {
    return;
  }

  const slugs = new Set();
  const categories = new Set();
  for (const article of articles) {
    for (const slug of collectSlugs(article)) slugs.add(slug);
    for (const category of collectCategories(article)) categories.add(category);
  }

  cacheRevalidateService.requestCacheRevalidation(reason, {
    slugs: Array.from(slugs),
    categories: Array.from(categories),
  });
}

const listPublic = asyncHandler(async (req, res) => {
  const result = await articleService.listPublishedArticles({
    language: req.query.language,
    page: req.query.page,
    limit: req.query.limit,
    categorySlug: req.query.category,
    tag: req.query.tag,
    featured: req.query.featured,
    breaking: req.query.breaking,
    search: req.query.q,
  });
  return ok(res, result.articles, 200, result.meta);
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const language = req.query.language || "hi";
  const article = await articleService.getPublishedBySlug(req.params.slug, language);
  return ok(res, article);
});

const listFeatured = asyncHandler(async (req, res) => {
  const result = await articleService.listPublishedArticles({
    language: req.query.language || "hi",
    page: req.query.page || 1,
    limit: req.query.limit || 10,
    featured: true,
  });
  return ok(res, result.articles, 200, result.meta);
});

const listBreaking = asyncHandler(async (req, res) => {
  const result = await articleService.listPublishedArticles({
    language: req.query.language || "hi",
    page: 1,
    limit: req.query.limit || 8,
    breaking: true,
  });
  return ok(res, result.articles, 200, result.meta);
});

const listTrending = asyncHandler(async (req, res) => {
  const articles = await articleService.getTrending(
    req.query.language || "hi",
    req.query.limit || 8,
  );
  return ok(res, articles);
});

const listAdmin = asyncHandler(async (req, res) => {
  const result = await articleService.listAdminArticles({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status,
    language: req.query.language || "hi",
    search: typeof req.query.q === "string" ? req.query.q.trim() : undefined,
    actor: req.user,
  });
  return ok(res, result.articles, 200, result.meta);
});

const getAdminById = asyncHandler(async (req, res) => {
  const article = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  return ok(res, article);
});

const create = asyncHandler(async (req, res) => {
  const id = await articleService.createArticle(req.body, req.user);
  const article = await articleService.getAdminArticleById(id, req.user);
  queuePublicRevalidation(
    "article.create",
    null,
    article.status,
    article.status === "published" ? "publish" : "create",
    [article],
  );
  return created(res, article);
});

const update = asyncHandler(async (req, res) => {
  const before = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  await articleService.updateArticle(req.params.id, req.body, req.user);
  const article = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  queuePublicRevalidation(
    "article.update",
    before.status,
    article.status,
    "update",
    [before, article],
  );
  return ok(res, article);
});

const remove = asyncHandler(async (req, res) => {
  const before = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  await articleService.deleteArticle(req.params.id, req.user);
  queuePublicRevalidation("article.delete", before.status, null, "delete", [
    before,
  ]);
  return ok(res, { deleted: true });
});

const publish = asyncHandler(async (req, res) => {
  await articleService.setStatus(
    req.params.id,
    "published",
    { publishedAt: req.body.publishedAt },
    req.user,
  );
  const article = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  queuePublicRevalidation(
    "article.publish",
    "draft",
    article.status,
    "publish",
    [article],
  );
  return ok(res, article);
});

const schedule = asyncHandler(async (req, res) => {
  await articleService.setStatus(
    req.params.id,
    "scheduled",
    { scheduledAt: req.body.scheduledAt },
    req.user,
  );
  const article = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  // Revalidation is deferred until the scheduled publisher marks it published.
  queuePublicRevalidation(
    "article.schedule",
    article.status,
    article.status,
    "schedule",
    [article],
  );
  return ok(res, article);
});

const archive = asyncHandler(async (req, res) => {
  const before = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  await articleService.setStatus(req.params.id, "archived", {}, req.user);
  const article = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  queuePublicRevalidation(
    "article.archive",
    before.status,
    article.status,
    "archive",
    [before, article],
  );
  return ok(res, article);
});

module.exports = {
  listPublic,
  getPublicBySlug,
  listFeatured,
  listBreaking,
  listTrending,
  listAdmin,
  getAdminById,
  create,
  update,
  remove,
  publish,
  schedule,
  archive,
};
