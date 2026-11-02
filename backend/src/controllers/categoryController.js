const categoryService = require("../services/categoryService");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

const listPublic = asyncHandler(async (req, res) => {
  const categories = await categoryService.listPublicCategories(
    req.query.language || "hi",
  );
  return ok(res, categories);
});

const getBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(
    req.params.slug,
    req.query.language || "hi",
  );
  return ok(res, category);
});

const listAdmin = asyncHandler(async (_req, res) => {
  const categories = await categoryService.listAdminCategories();
  return ok(res, categories);
});

const create = asyncHandler(async (req, res) => {
  const id = await categoryService.createCategory(req.body);
  const categories = await categoryService.listAdminCategories();
  const category = categories.find((item) => item.id === id);
  return created(res, category);
});

const update = asyncHandler(async (req, res) => {
  await categoryService.updateCategory(req.params.id, req.body);
  const categories = await categoryService.listAdminCategories();
  const category = categories.find((item) => item.id === Number(req.params.id));
  return ok(res, category);
});

module.exports = {
  listPublic,
  getBySlug,
  listAdmin,
  create,
  update,
};
