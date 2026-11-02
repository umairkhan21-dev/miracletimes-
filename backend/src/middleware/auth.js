const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const authService = require("../services/authService");
const { asyncHandler } = require("../utils/asyncHandler");

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookieToken = req.cookies?.[env.COOKIE_NAME];
  if (cookieToken) return cookieToken;
  return null;
}

const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError("Authentication required", 401, { code: "UNAUTHORIZED" });
  }

  const payload = authService.verifyToken(token);
  const user = await authService.findUserById(payload.sub);
  if (!user) {
    throw new AppError("Authentication required", 401, { code: "UNAUTHORIZED" });
  }
  if (!user.is_active) {
    throw new AppError("Account is inactive", 403, { code: "ACCOUNT_INACTIVE" });
  }

  req.user = authService.toPublicUser(user);
  req.token = token;
  next();
});

function optionalAuthenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  return authenticate(req, res, next);
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401, { code: "UNAUTHORIZED" }));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError("Insufficient permissions", 403, { code: "FORBIDDEN" }));
      return;
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRoles,
};
