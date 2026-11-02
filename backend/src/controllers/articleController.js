const articleService = require("../services/articleService");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

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
  });
  return ok(res, result.articles, 200, result.meta);
});

const getAdminById = asyncHandler(async (req, res) => {
  const article = await articleService.getAdminArticleById(req.params.id);
  return ok(res, article);
});

const create = asyncHandler(async (req, res) => {
  const id = await articleService.createArticle(req.body, req.user);
  const article = await articleService.getAdminArticleById(id);
  return created(res, article);
});

const update = asyncHandler(async (req, res) => {
  await articleService.updateArticle(req.params.id, req.body, req.user);
  const article = await articleService.getAdminArticleById(req.params.id);
  return ok(res, article);
});

const remove = asyncHandler(async (req, res) => {
  await articleService.deleteArticle(req.params.id, req.user);
  return ok(res, { deleted: true });
});

const publish = asyncHandler(async (req, res) => {
  await articleService.setStatus(req.params.id, "published", {
    publishedAt: req.body.publishedAt,
  });
  const article = await articleService.getAdminArticleById(req.params.id);
  return ok(res, article);
});

const schedule = asyncHandler(async (req, res) => {
  await articleService.setStatus(req.params.id, "scheduled", {
    scheduledAt: req.body.scheduledAt,
  });
  const article = await articleService.getAdminArticleById(req.params.id);
  return ok(res, article);
});

const archive = asyncHandler(async (req, res) => {
  await articleService.setStatus(req.params.id, "archived");
  const article = await articleService.getAdminArticleById(req.params.id);
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
