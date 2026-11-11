const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseEnv } = require("../src/config/env");

const baseDev = {
  NODE_ENV: "development",
  DB_HOST: "localhost",
  DB_USER: "root",
  DB_NAME: "miracle_times",
  JWT_SECRET: "change-me-to-a-long-random-string",
  FRONTEND_URL: "http://localhost:3000",
  PUBLIC_BASE_URL: "http://localhost:4000",
};

const baseProd = {
  ...baseDev,
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(32) + "-unique-production-secret",
  DB_PASSWORD: "prod-db-password-not-a-secret-in-tests",
  FRONTEND_URL: "https://miracletimes.in",
  CORS_ORIGINS: "https://miracletimes.in,https://www.miracletimes.in",
  PUBLIC_BASE_URL: "https://api.miracletimes.in",
  FRONTEND_DEPLOY_HOOK_URL:
    "https://api.vercel.com/v1/integrations/deploy/example",
};

describe("production environment validation", () => {
  it("accepts a strong production configuration", () => {
    const parsed = parseEnv(baseProd);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.isProduction, true);
    assert.deepEqual(parsed.data.corsOrigins, [
      "https://miracletimes.in",
      "https://www.miracletimes.in",
    ]);
    // Production defaults to loopback when LISTEN_HOST is unset.
    assert.equal(parsed.data.LISTEN_HOST, "127.0.0.1");
  });

  it("allows explicit 0.0.0.0 LISTEN_HOST in production for PaaS", () => {
    const parsed = parseEnv({
      ...baseProd,
      LISTEN_HOST: "0.0.0.0",
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.LISTEN_HOST, "0.0.0.0");
  });

  it("rejects weak JWT_SECRET in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      JWT_SECRET: "change-me-to-a-long-random-string",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects short JWT_SECRET in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      JWT_SECRET: "short-but-not-32-chars",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects missing CORS_ORIGINS in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      CORS_ORIGINS: "",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects wildcard CORS origins", () => {
    const parsed = parseEnv({
      ...baseProd,
      CORS_ORIGINS: "*",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects non-HTTPS frontend URL in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      FRONTEND_URL: "http://miracletimes.in",
    });
    assert.equal(parsed.success, false);
  });

  it("still allows example JWT_SECRET and empty DB_PASSWORD in development", () => {
    const parsed = parseEnv(baseDev);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.isProduction, false);
    assert.equal(parsed.data.DB_PASSWORD, "");
    assert.equal(parsed.data.FRONTEND_DEPLOY_HOOK_URL, "");
  });

  it("rejects empty DB_PASSWORD in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      DB_PASSWORD: "",
    });
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.error.issues.some((issue) => issue.path.join(".") === "DB_PASSWORD"),
    );
  });

  it("rejects missing FRONTEND_DEPLOY_HOOK_URL in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      FRONTEND_DEPLOY_HOOK_URL: "",
    });
    assert.equal(parsed.success, false);
    assert.ok(
      parsed.error.issues.some(
        (issue) => issue.path.join(".") === "FRONTEND_DEPLOY_HOOK_URL",
      ),
    );
  });

  it("rejects non-HTTPS FRONTEND_DEPLOY_HOOK_URL in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      FRONTEND_DEPLOY_HOOK_URL: "http://example.com/hooks/bad",
    });
    assert.equal(parsed.success, false);
  });

  it("accepts optional COOKIE_DOMAIN and LISTEN_HOST in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      COOKIE_DOMAIN: ".miracletimes.in",
      LISTEN_HOST: "127.0.0.1",
      FRONTEND_DEPLOY_DEBOUNCE_MS: "30000",
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.COOKIE_DOMAIN, ".miracletimes.in");
    assert.equal(parsed.data.LISTEN_HOST, "127.0.0.1");
    assert.equal(parsed.data.FRONTEND_DEPLOY_DEBOUNCE_MS, 30000);
  });

  it("rejects invalid LISTEN_HOST", () => {
    const parsed = parseEnv({
      ...baseProd,
      LISTEN_HOST: "not a host",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects invalid JWT_EXPIRES_IN", () => {
    const parsed = parseEnv({
      ...baseDev,
      JWT_EXPIRES_IN: "not-a-duration",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects http CORS origins in production", () => {
    const parsed = parseEnv({
      ...baseProd,
      CORS_ORIGINS: "http://miracletimes.in",
    });
    assert.equal(parsed.success, false);
  });
});
