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

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  res.cookie(env.COOKIE_NAME, result.token, authService.cookieOptions());
  return ok(res, result);
});

const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "strict" : "lax",
    path: "/",
  });
  return ok(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user });
});

module.exports = { login, logout, me, loginLimiter };
