const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originAllowed(origin) {
  return Boolean(origin && env.corsOrigins.includes(origin));
}

function refererAllowed(referer) {
  if (!referer) return false;
  try {
    const url = new URL(referer);
    const origin = `${url.protocol}//${url.host}`;
    return env.corsOrigins.includes(origin);
  } catch {
    return false;
  }
}

/**
 * Mitigate CSRF for cookie-authenticated state changes.
 * Browser credentialed requests should send Origin; Bearer auth is exempt.
 */
function csrfProtect(req, _res, next) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    if (!originAllowed(origin)) {
      next(
        new AppError("Request origin is not allowed", 403, {
          code: "CSRF_REJECTED",
        }),
      );
      return;
    }
    next();
    return;
  }

  const hasSessionCookie = Boolean(req.cookies?.[env.COOKIE_NAME]);
  if (!hasSessionCookie && !env.isProduction) {
    next();
    return;
  }

  if (refererAllowed(req.get("referer"))) {
    next();
    return;
  }

  if (env.isProduction || hasSessionCookie) {
    next(
      new AppError("Missing or invalid request origin", 403, {
        code: "CSRF_REJECTED",
      }),
    );
    return;
  }

  next();
}

module.exports = { csrfProtect };
