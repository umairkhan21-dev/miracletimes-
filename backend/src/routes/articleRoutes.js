const express = require("express");
const articleController = require("../controllers/articleController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { validate, validateRequest } = require("../middleware/validate");
const {
  articleWriteSchema,
  articleUpdateSchema,
  idParamSchema,
  publicListQuerySchema,
  slugParamSchema,
  scheduleSchema,
  publishSchema,
} = require("../validators/articleValidators");

const router = express.Router();

router.get(
  "/",
  validate(publicListQuerySchema, "query"),
  articleController.listPublic,
);
router.get("/featured", articleController.listFeatured);
router.get("/breaking", articleController.listBreaking);
router.get("/trending", articleController.listTrending);

router.get(
  "/admin",
  authenticate,
  requireRoles("admin", "editor", "author"),
  articleController.listAdmin,
);
router.get(
  "/admin/:id",
  authenticate,
  requireRoles("admin", "editor", "author"),
  validate(idParamSchema, "params"),
  articleController.getAdminById,
);
router.post(
  "/",
  authenticate,
  requireRoles("admin", "editor", "author"),
  validate(articleWriteSchema),
  articleController.create,
);
router.put(
  "/:id",
  authenticate,
  requireRoles("admin", "editor", "author"),
  validateRequest({ params: idParamSchema, body: articleUpdateSchema }),
  articleController.update,
);
router.delete(
  "/:id",
  authenticate,
  requireRoles("admin", "editor"),
  validate(idParamSchema, "params"),
  articleController.remove,
);
router.post(
  "/:id/publish",
  authenticate,
  requireRoles("admin", "editor"),
  validateRequest({ params: idParamSchema, body: publishSchema }),
  articleController.publish,
);
router.post(
  "/:id/schedule",
  authenticate,
  requireRoles("admin", "editor"),
  validateRequest({ params: idParamSchema, body: scheduleSchema }),
  articleController.schedule,
);
router.post(
  "/:id/archive",
  authenticate,
  requireRoles("admin", "editor"),
  validate(idParamSchema, "params"),
  articleController.archive,
);

router.get(
  "/:slug",
  validate(slugParamSchema, "params"),
  articleController.getPublicBySlug,
);

module.exports = router;
