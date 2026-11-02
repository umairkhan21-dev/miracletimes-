const mediaService = require("../services/mediaService");
const { AppError } = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok, created } = require("../utils/response");

const upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Image file is required", 400, { code: "VALIDATION_ERROR" });
  }
  const media = await mediaService.uploadImage({
    buffer: req.file.buffer,
    originalFilename: req.file.originalname,
    declaredMime: req.file.mimetype,
    uploadedBy: req.user.id,
  });
  return created(res, media);
});

const fromUrl = asyncHandler(async (req, res) => {
  const media = await mediaService.registerExternalUrl({
    url: req.body.url,
    uploadedBy: req.user.id,
  });
  return created(res, media);
});

const list = asyncHandler(async (req, res) => {
  const result = await mediaService.listMedia({
    page: req.query.page,
    limit: req.query.limit,
  });
  return ok(res, result.media, 200, result.meta);
});

const remove = asyncHandler(async (req, res) => {
  await mediaService.deleteMedia(req.params.id);
  return ok(res, { deleted: true });
});

module.exports = { upload, fromUrl, list, remove };
