const multer = require("multer");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const { ALLOWED_MIME } = require("../services/mediaService");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(
        new AppError("Unsupported file type. Use JPEG, PNG, WebP, or AVIF.", 400, {
          code: "INVALID_IMAGE",
        }),
      );
      return;
    }
    cb(null, true);
  },
});

function singleImage(fieldName = "file") {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            new AppError("File exceeds upload size limit", 400, {
              code: "FILE_TOO_LARGE",
            }),
          );
          return;
        }
        next(new AppError(error.message, 400, { code: "UPLOAD_ERROR" }));
        return;
      }
      next(error);
    });
  };
}

module.exports = { singleImage };
