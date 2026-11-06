const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool } = require("../src/config/database");
const { env } = require("../src/config/env");
const authService = require("../src/services/authService");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  cookieHeaders,
} = require("./helpers");

describe("auth login cookie session", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let admin;

  before(async () => {
    await verifyConnection();
    server = await startTestServer();
    admin = await createTestUser({ role: "admin", name: "Login Admin" });
  });

  after(async () => {
    await deleteTestUser(admin?.id);
    await server.close();
    await closePool();
  });

  it("exposes cookie options compatible with same-site subdomain architecture", () => {
    const options = authService.cookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/");
    assert.equal(options.secure, env.isProduction);
    assert.equal(options.sameSite, env.isProduction ? "strict" : "lax");
    assert.equal(
      options.maxAge,
      authService.parseJwtExpiresInMs(env.JWT_EXPIRES_IN),
    );
    if (env.COOKIE_DOMAIN) {
      assert.equal(options.domain, env.COOKIE_DOMAIN);
    } else {
      assert.equal(options.domain, undefined);
    }
  });

  it("keeps JWT lifetime aligned with cookie maxAge", () => {
    const token = authService.signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });
    const payload = require("jsonwebtoken").decode(token);
    const lifetimeMs = (payload.exp - payload.iat) * 1000;
    assert.equal(lifetimeMs, authService.cookieOptions().maxAge);
  });

  it("sets HttpOnly cookie and omits JWT from login JSON", async () => {
    const response = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: env.FRONTEND_URL,
      },
      body: JSON.stringify({
        email: admin.email,
        password: admin.password,
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(body.data.user);
    assert.equal(body.data.user.email, admin.email);
    assert.equal(Object.prototype.hasOwnProperty.call(body.data, "token"), false);
    assert.equal(body.data.token, undefined);

    const setCookie = response.headers.getSetCookie?.() || [];
    const cookieHeader =
      setCookie.find((value) => value.startsWith(`${env.COOKIE_NAME}=`)) ||
      response.headers.get("set-cookie") ||
      "";
    assert.match(cookieHeader, new RegExp(`${env.COOKIE_NAME}=`));
    assert.match(cookieHeader, /HttpOnly/i);
    assert.doesNotMatch(cookieHeader, /SameSite=None/i);

    const me = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: cookieHeaders(admin.token),
    });
    assert.equal(me.status, 200);
    const meBody = await me.json();
    assert.equal(meBody.data.user.id, admin.id);
  });

  it("rejects cookie-authenticated mutations without an allowed Origin", async () => {
    // Missing Origin/Referer with a session cookie → CSRF middleware 403.
    const missingOrigin = await fetch(`${server.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${env.COOKIE_NAME}=${admin.token}`,
      },
    });
    assert.equal(missingOrigin.status, 403);
    const missingBody = await missingOrigin.json();
    assert.equal(missingBody.error.code, "CSRF_REJECTED");

    // Disallowed Origin: no reflected ACAO; CSRF still rejects the mutation.
    const evilOrigin = await fetch(`${server.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${env.COOKIE_NAME}=${admin.token}`,
        Origin: "https://evil.example",
      },
    });
    assert.equal(evilOrigin.status, 403);
    assert.equal((await evilOrigin.json()).error.code, "CSRF_REJECTED");
    assert.equal(
      evilOrigin.headers.get("access-control-allow-origin"),
      null,
    );
  });
});
