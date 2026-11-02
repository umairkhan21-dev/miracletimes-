const express = require("express");
const mediaController = require("../controllers/mediaController");
const { authenticate, requireRoles } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { singleImage } = require("../middleware/upload");
const {
  fromUrlSchema,
  idParamSchema,
  listQuerySchema,
} = require("../validators/mediaValidators");

const router = express.Router();

router.use(authenticate, requireRoles("admin", "editor", "author"));

router.get("/", validate(listQuerySchema, "query"), mediaController.list);
router.post("/upload", singleImage("file"), mediaController.upload);
router.post("/from-url", validate(fromUrlSchema), mediaController.fromUrl);
router.delete("/:id", validate(idParamSchema, "params"), mediaController.remove);

module.exports = router;
