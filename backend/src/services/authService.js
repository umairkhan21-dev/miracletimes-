const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { query } = require("../config/database");
const { AppError } = require("../utils/AppError");
const { parseJwtExpiresInMs } = require("../utils/expiresIn");
const { isJtiRevoked, revokeJti } = require("./tokenRevocation");

const PUBLIC_USER_FIELDS = "id, name, email, role, is_active, created_at, updated_at";

function signToken(user) {
  // Pass seconds so lifetime matches cookie maxAge for all supported formats
  // (including digit-only env values treated as seconds).
  const expiresInSeconds = Math.floor(
    parseJwtExpiresInMs(env.JWT_EXPIRES_IN) / 1000,
  );
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      jti: crypto.randomUUID(),
    },
    env.JWT_SECRET,
    { expiresIn: expiresInSeconds },
  );
}

function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError("Invalid or expired token", 401, { code: "UNAUTHORIZED" });
  }
  if (payload?.jti && isJtiRevoked(payload.jti)) {
    throw new AppError("Invalid or expired token", 401, { code: "UNAUTHORIZED" });
  }
  return payload;
}

function revokeToken(token) {
  if (!token) return;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true });
    if (payload?.jti) {
      revokeJti(payload.jti, payload.exp);
    }
  } catch {
    // Ignore malformed tokens on logout — cookie is cleared regardless.
  }
}

async function findUserByEmail(email) {
  const rows = await query(
    `SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
     FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query(
    `SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

function toPublicUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError("Invalid email or password", 401, { code: "INVALID_CREDENTIALS" });
  }

  if (!user.is_active) {
    throw new AppError("Account is inactive", 403, { code: "ACCOUNT_INACTIVE" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AppError("Invalid email or password", 401, { code: "INVALID_CREDENTIALS" });
  }

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
}

function cookieOptions() {
  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "strict" : "lax",
    maxAge: parseJwtExpiresInMs(env.JWT_EXPIRES_IN),
    path: "/",
  };
  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }
  return options;
}

module.exports = {
  signToken,
  verifyToken,
  revokeToken,
  findUserById,
  login,
  toPublicUser,
  cookieOptions,
  parseJwtExpiresInMs,
};
