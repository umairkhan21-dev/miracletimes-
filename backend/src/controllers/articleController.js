const articleService = require("../services/articleService");
const siteRebuildService = require("../services/siteRebuildService");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

function queuePublicRebuild(reason, previousStatus, nextStatus, action) {
  if (
    !siteRebuildService.shouldRebuildForArticle({
      previousStatus,
      nextStatus,
      action,
    })
  ) {
    return;
  }
  siteRebuildService.requestFrontendRebuild(reason);
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
  queuePublicRebuild(
    "article.create",
    null,
    article.status,
    article.status === "published" ? "publish" : "create",
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
  queuePublicRebuild(
    "article.update",
    before.status,
    article.status,
    "update",
  );
  return ok(res, article);
});

const remove = asyncHandler(async (req, res) => {
  const before = await articleService.getAdminArticleById(
    req.params.id,
    req.user,
  );
  await articleService.deleteArticle(req.params.id, req.user);
  queuePublicRebuild("article.delete", before.status, null, "delete");
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
  queuePublicRebuild("article.publish", "draft", article.status, "publish");
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
  // Rebuild is deferred until the scheduled publisher marks it published.
  queuePublicRebuild(
    "article.schedule",
    article.status,
    article.status,
    "schedule",
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
  queuePublicRebuild(
    "article.archive",
    before.status,
    article.status,
    "archive",
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
