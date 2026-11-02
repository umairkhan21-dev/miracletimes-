const express = require("express");
const categoryController = require("../controllers/categoryController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { validate, validateRequest } = require("../middleware/validate");
const {
  createCategorySchema,
  updateCategorySchema,
  categoryListQuerySchema,
  idParamSchema,
} = require("../validators/categoryValidators");
const { z } = require("zod");

const router = express.Router();

router.get(
  "/",
  validate(categoryListQuerySchema, "query"),
  categoryController.listPublic,
);
router.get(
  "/admin",
  authenticate,
  requireRoles("admin", "editor"),
  categoryController.listAdmin,
);
router.post(
  "/",
  authenticate,
  requireRoles("admin", "editor"),
  validate(createCategorySchema),
  categoryController.create,
);
router.put(
  "/:id",
  authenticate,
  requireRoles("admin", "editor"),
  validateRequest({ params: idParamSchema, body: updateCategorySchema }),
  categoryController.update,
);
router.get(
  "/:slug",
  validateRequest({
    params: z.object({ slug: z.string().trim().min(1).max(120) }),
    query: categoryListQuerySchema,
  }),
  categoryController.getBySlug,
);

module.exports = router;
