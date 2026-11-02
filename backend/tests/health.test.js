const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { verifyConnection, closePool } = require("../src/config/database");

describe("health endpoint", () => {
  /** @type {import('http').Server} */
  let server;
  /** @type {string} */
  let baseUrl;

  before(async () => {
    await verifyConnection();
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await closePool();
  });

  it("returns database connectivity", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
    assert.equal(body.data.database.connected, true);
    assert.equal(body.data.database.name, "miracle_times");
  });
});
