const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { assertSafeRemoteUrl } = require("../src/services/mediaService");

describe("SSRF URL checks", () => {
  it("rejects localhost URLs", async () => {
    await assert.rejects(
      () => assertSafeRemoteUrl("http://localhost/image.jpg"),
      (error) => error.code === "SSRF_BLOCKED" || error.statusCode === 400,
    );
  });

  it("rejects private IPv4 URLs", async () => {
    await assert.rejects(
      () => assertSafeRemoteUrl("http://127.0.0.1/image.jpg"),
      (error) => error.code === "SSRF_BLOCKED" || error.statusCode === 400,
    );
  });

  it("rejects non-http schemes", async () => {
    await assert.rejects(
      () => assertSafeRemoteUrl("file:///etc/passwd"),
      (error) => error.statusCode === 400,
    );
  });
});
