const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");
const authService = require("../services/authService");
const { asyncHandler } = require("../utils/asyncHandler");
const { ok } = require("../utils/response");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many login attempts. Please try again later.",
    },
  },
});

function extractPresentedToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return req.cookies?.[env.COOKIE_NAME] || null;
}

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  res.cookie(env.COOKIE_NAME, result.token, authService.cookieOptions());
  // Never return the JWT in the JSON body — HttpOnly cookie only.
  return ok(res, { user: result.user });
});

const logout = asyncHandler(async (req, res) => {
  const token = extractPresentedToken(req);
  authService.revokeToken(token);

  const clearOptions = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "strict" : "lax",
    path: "/",
  };
  if (env.COOKIE_DOMAIN) {
    clearOptions.domain = env.COOKIE_DOMAIN;
  }
  res.clearCookie(env.COOKIE_NAME, clearOptions);
  return ok(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user });
});

module.exports = { login, logout, me, loginLimiter };
