const net = require("net");
const path = require("path");
const { z } = require("zod");
const dotenv = require("dotenv");
const { parseJwtExpiresInMs } = require("../utils/expiresIn");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const WEAK_JWT_SECRETS = new Set([
  "change-me-to-a-long-random-string",
  "change-me",
  "changeme",
  "secret",
  "jwt_secret",
  "jwtsecret",
  "password",
  "dev-secret",
  "development",
  "test-secret",
  "supersecret",
  "your-secret-here",
]);

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hasWildcardOrigin(origins) {
  return origins.some(
    (origin) => origin === "*" || origin.includes("*") || origin === "null",
  );
}

/** Accept Node listen hosts: IPs, localhost, DNS labels, or all-interfaces. */
function isValidListenHost(host) {
  if (!host) return false;
  if (host === "0.0.0.0" || host === "::" || host === "localhost") return true;
  if (net.isIP(host)) return true;
  // Bracketed IPv6 as sometimes used in URLs/config: [::1]
  if (host.startsWith("[") && host.endsWith("]")) {
    return Boolean(net.isIP(host.slice(1, -1)));
  }
  // Simple hostname / DNS label check (no spaces or path chars).
  return /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(
    host,
  );
}

/**
 * Parse and validate environment configuration.
 * Exported for unit tests — production startup still fails fast via loadEnv().
 * @param {NodeJS.ProcessEnv} [raw]
 */
function parseEnv(raw = process.env) {
  const nodeEnv = raw.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  const envSchema = z
    .object({
      PORT: z.coerce.number().int().positive().default(4000),
      NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
      DB_HOST: z.string().min(1),
      DB_PORT: z.coerce.number().int().positive().default(3306),
      DB_USER: z.string().min(1),
      // Empty allowed in development (e.g. local MySQL). Required in production.
      DB_PASSWORD: z.string().optional().default(""),
      DB_NAME: z.string().min(1),
      JWT_SECRET: isProduction
        ? z
            .string()
            .min(32, "JWT_SECRET must be at least 32 characters in production")
        : z.string().min(16, "JWT_SECRET must be at least 16 characters"),
      // Shorter default reduces stolen-token window (see token revocation on logout).
      JWT_EXPIRES_IN: z.string().default("12h"),
      COOKIE_NAME: z.string().default("mt_token"),
      COOKIE_DOMAIN: z.string().min(1).optional(),
      FRONTEND_URL: z.string().url(),
      CORS_ORIGINS: z.string().optional(),
      UPLOAD_DIR: z.string().default("uploads"),
      MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(1_048_576),
      PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),
      SCHEDULE_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
      // Empty in development → Node default (all interfaces) for local DX.
      // Empty in production → forced to 127.0.0.1 (Nginx reverse-proxy safe).
      // Set LISTEN_HOST=0.0.0.0 explicitly only when a PaaS requires it.
      LISTEN_HOST: z.string().optional().default(""),
      // On-demand Next.js cache revalidation (replaces static-export rebuild hook).
      // Production requires both URL + shared secret. Leave empty in development.
      CACHE_REVALIDATE_URL: z.string().optional().default(""),
      CACHE_REVALIDATE_TOKEN: z.string().optional().default(""),
      CACHE_REVALIDATE_DEBOUNCE_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(5_000),
      // Deprecated alias — if set, maps to CACHE_REVALIDATE_URL for migration.
      FRONTEND_DEPLOY_HOOK_URL: z.string().optional().default(""),
      FRONTEND_DEPLOY_DEBOUNCE_MS: z.coerce
        .number()
        .int()
        .positive()
        .optional(),
      // Media storage: local (default) or s3 (R2 / Contabo Object Storage / AWS).
      STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
      S3_ENDPOINT: z.string().optional().default(""),
      S3_REGION: z.string().optional().default("auto"),
      S3_BUCKET: z.string().optional().default(""),
      S3_ACCESS_KEY_ID: z.string().optional().default(""),
      S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
      S3_PUBLIC_BASE_URL: z.string().optional().default(""),
      S3_FORCE_PATH_STYLE: z.string().optional().default("true"),
    })
    .superRefine((data, ctx) => {
      try {
        parseJwtExpiresInMs(data.JWT_EXPIRES_IN);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_EXPIRES_IN"],
          message:
            error instanceof Error
              ? error.message
              : "JWT_EXPIRES_IN is invalid",
        });
      }

      const listenHost = (data.LISTEN_HOST || "").trim();
      if (listenHost && !isValidListenHost(listenHost)) {
        ctx.addIssue({
          code: "custom",
          path: ["LISTEN_HOST"],
          message:
            "LISTEN_HOST must be a hostname, IP address, 0.0.0.0, or :: when set",
        });
      }

      const revalidateUrl = (
        data.CACHE_REVALIDATE_URL ||
        data.FRONTEND_DEPLOY_HOOK_URL ||
        ""
      ).trim();
      if (
        revalidateUrl &&
        !isHttpsUrl(revalidateUrl) &&
        !/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(
          revalidateUrl,
        )
      ) {
        try {
          // eslint-disable-next-line no-new
          new URL(revalidateUrl);
        } catch {
          ctx.addIssue({
            code: "custom",
            path: ["CACHE_REVALIDATE_URL"],
            message: "CACHE_REVALIDATE_URL must be a valid URL when set",
          });
        }
      }

      if (data.STORAGE_PROVIDER === "s3") {
        for (const key of [
          "S3_ENDPOINT",
          "S3_BUCKET",
          "S3_ACCESS_KEY_ID",
          "S3_SECRET_ACCESS_KEY",
          "S3_PUBLIC_BASE_URL",
        ]) {
          if (!String(data[key] || "").trim()) {
            ctx.addIssue({
              code: "custom",
              path: [key],
              message: `${key} is required when STORAGE_PROVIDER=s3`,
            });
          }
        }
      }

      if (!isProduction) return;

      if (!String(data.DB_PASSWORD || "").trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["DB_PASSWORD"],
          message: "DB_PASSWORD is required in production",
        });
      }

      const secret = data.JWT_SECRET.trim();
      if (
        WEAK_JWT_SECRETS.has(secret.toLowerCase()) ||
        /^(change-me|password|secret|test)/i.test(secret)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_SECRET"],
          message:
            "JWT_SECRET must be a unique random secret (not an example/placeholder value)",
        });
      }

      if (!data.CORS_ORIGINS || !data.CORS_ORIGINS.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["CORS_ORIGINS"],
          message:
            "CORS_ORIGINS is required in production (comma-separated exact origins)",
        });
      }
      if (!isHttpsUrl(data.FRONTEND_URL)) {
        ctx.addIssue({
          code: "custom",
          path: ["FRONTEND_URL"],
          message: "FRONTEND_URL must use https:// in production",
        });
      }
      if (!isHttpsUrl(data.PUBLIC_BASE_URL)) {
        ctx.addIssue({
          code: "custom",
          path: ["PUBLIC_BASE_URL"],
          message: "PUBLIC_BASE_URL must use https:// in production",
        });
      }

      // SSR architecture: publishes go live via secure cache revalidation.
      if (!revalidateUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["CACHE_REVALIDATE_URL"],
          message:
            "CACHE_REVALIDATE_URL is required in production (Next.js /api/revalidate HTTPS URL)",
        });
      } else if (
        !isHttpsUrl(revalidateUrl) &&
        !/^http:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/i.test(revalidateUrl)
      ) {
        // Allow loopback HTTP only for same-host Nginx→Next on Contabo.
        ctx.addIssue({
          code: "custom",
          path: ["CACHE_REVALIDATE_URL"],
          message:
            "CACHE_REVALIDATE_URL must use https:// in production (or http://127.0.0.1 for local Next)",
        });
      }

      if (!String(data.CACHE_REVALIDATE_TOKEN || "").trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["CACHE_REVALIDATE_TOKEN"],
          message:
            "CACHE_REVALIDATE_TOKEN is required in production (shared secret for X-Revalidate-Token)",
        });
      } else if (String(data.CACHE_REVALIDATE_TOKEN).trim().length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["CACHE_REVALIDATE_TOKEN"],
          message: "CACHE_REVALIDATE_TOKEN must be at least 32 characters",
        });
      }
    });

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed;
  }

  const data = parsed.data;
  const corsOrigins = (data.CORS_ORIGINS || data.FRONTEND_URL)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!corsOrigins.length) {
    return {
      success: false,
      error: {
        issues: [
          {
            path: ["CORS_ORIGINS"],
            message: "At least one CORS origin is required",
          },
        ],
      },
    };
  }

  if (hasWildcardOrigin(corsOrigins)) {
    return {
      success: false,
      error: {
        issues: [
          {
            path: ["CORS_ORIGINS"],
            message:
              "Wildcard CORS origins are not allowed with credentialed requests",
          },
        ],
      },
    };
  }

  for (const origin of corsOrigins) {
    try {
      // eslint-disable-next-line no-new
      new URL(origin);
    } catch {
      return {
        success: false,
        error: {
          issues: [
            {
              path: ["CORS_ORIGINS"],
              message: `Invalid CORS origin: ${origin}`,
            },
          ],
        },
      };
    }
    if (data.NODE_ENV === "production" && !isHttpsUrl(origin)) {
      return {
        success: false,
        error: {
          issues: [
            {
              path: ["CORS_ORIGINS"],
              message: `Production CORS origin must use https://: ${origin}`,
            },
          ],
        },
      };
    }
  }

  const listenHostRaw = (data.LISTEN_HOST || "").trim();
  // Production defaults to loopback so a missing env cannot expose Node publicly.
  const listenHost =
    listenHostRaw ||
    (data.NODE_ENV === "production" ? "127.0.0.1" : "");

  const cacheRevalidateUrl = (
    data.CACHE_REVALIDATE_URL ||
    data.FRONTEND_DEPLOY_HOOK_URL ||
    ""
  ).trim();
  const cacheRevalidateToken = (data.CACHE_REVALIDATE_TOKEN || "").trim();
  const cacheRevalidateDebounceMs =
    data.FRONTEND_DEPLOY_DEBOUNCE_MS ||
    data.CACHE_REVALIDATE_DEBOUNCE_MS ||
    5_000;

  return {
    success: true,
    data: {
      ...data,
      CACHE_REVALIDATE_URL: cacheRevalidateUrl,
      CACHE_REVALIDATE_TOKEN: cacheRevalidateToken,
      CACHE_REVALIDATE_DEBOUNCE_MS: cacheRevalidateDebounceMs,
      // Deprecated alias kept for older docs/tests during migration.
      FRONTEND_DEPLOY_HOOK_URL: cacheRevalidateUrl,
      FRONTEND_DEPLOY_DEBOUNCE_MS: cacheRevalidateDebounceMs,
      S3_FORCE_PATH_STYLE:
        String(data.S3_FORCE_PATH_STYLE || "true") !== "false" &&
        String(data.S3_FORCE_PATH_STYLE || "true") !== "0",
      LISTEN_HOST: listenHost,
      corsOrigins,
      isProduction: data.NODE_ENV === "production",
      uploadPath: path.isAbsolute(data.UPLOAD_DIR)
        ? data.UPLOAD_DIR
        : path.resolve(__dirname, "../../", data.UPLOAD_DIR),
    },
  };
}

function loadEnv() {
  const parsed = parseEnv(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error("Invalid environment configuration:\n" + details);
    process.exit(1);
  }
  return parsed.data;
}

const env = loadEnv();

module.exports = { env, parseEnv };
