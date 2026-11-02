const { ZodError } = require("zod");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const logger = require("../utils/logger");

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, {
    code: "NOT_FOUND",
  }));
}

function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "Internal server error";
  let details;

  if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    code = "DUPLICATE";
    message = "A record with this unique value already exists";
  } else if (err.code === "ER_NO_REFERENCED_ROW_2") {
    statusCode = 400;
    code = "FOREIGN_KEY";
    message = "Referenced record does not exist";
  } else if (err instanceof AppError) {
    details = err.details;
  } else if (!err.isOperational) {
    logger.error("Unhandled error", {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
    if (env.isProduction) {
      message = "Internal server error";
      code = "INTERNAL_ERROR";
    }
  }

  const body = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  if (!env.isProduction && err.stack && statusCode >= 500) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
