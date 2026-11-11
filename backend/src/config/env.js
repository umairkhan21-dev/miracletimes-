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
      // Required HTTPS rebuild webhook in production (Contabo rebuild hook or
      // any HTTPS endpoint that triggers `npm run build:export` + publish).
      // Leave empty in development so local publishes do not fire deploys.
      FRONTEND_DEPLOY_HOOK_URL: z.string().optional().default(""),
      FRONTEND_DEPLOY_DEBOUNCE_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(45_000),
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

      const hook = (data.FRONTEND_DEPLOY_HOOK_URL || "").trim();
      if (hook && !isHttpsUrl(hook) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(hook)) {
        try {
          // eslint-disable-next-line no-new
          new URL(hook);
        } catch {
          ctx.addIssue({
            code: "custom",
            path: ["FRONTEND_DEPLOY_HOOK_URL"],
            message: "FRONTEND_DEPLOY_HOOK_URL must be a valid URL when set",
          });
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

      // Static export architecture: publishes only go live after a rebuild.
      if (!hook) {
        ctx.addIssue({
          code: "custom",
          path: ["FRONTEND_DEPLOY_HOOK_URL"],
          message:
            "FRONTEND_DEPLOY_HOOK_URL is required in production (Vercel Deploy Hook HTTPS URL)",
        });
      } else if (!isHttpsUrl(hook)) {
        ctx.addIssue({
          code: "custom",
          path: ["FRONTEND_DEPLOY_HOOK_URL"],
          message: "FRONTEND_DEPLOY_HOOK_URL must use https:// in production",
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

  return {
    success: true,
    data: {
      ...data,
      FRONTEND_DEPLOY_HOOK_URL: (data.FRONTEND_DEPLOY_HOOK_URL || "").trim(),
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
