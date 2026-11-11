const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool } = require("../src/config/database");
const authService = require("../src/services/authService");
const { clearRevocations } = require("../src/services/tokenRevocation");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  cookieHeaders,
  bearerHeaders,
} = require("./helpers");

describe("JWT logout revocation", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let admin;

  before(async () => {
    await verifyConnection();
    clearRevocations();
    server = await startTestServer();
    admin = await createTestUser({ role: "admin", name: "Revoke Admin" });
  });

  after(async () => {
    clearRevocations();
    await deleteTestUser(admin?.id);
    await server.close();
    await closePool();
  });

  it("rejects a token after logout revokes its jti", async () => {
    const token = authService.signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });
    authService.verifyToken(token);

    const logout = await fetch(`${server.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: cookieHeaders(token),
    });
    assert.equal(logout.status, 200);

    assert.throws(
      () => authService.verifyToken(token),
      (error) => error.statusCode === 401,
    );

    const me = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: bearerHeaders(token),
    });
    assert.equal(me.status, 401);
  });

  it("includes a jti claim on newly signed tokens", () => {
    const token = authService.signToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });
    const payload = require("jsonwebtoken").decode(token);
    assert.equal(typeof payload.jti, "string");
    assert.ok(payload.jti.length > 10);
  });
});
