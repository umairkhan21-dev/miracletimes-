const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");

describe("storage provider selection", () => {
  it("defaults to local provider", () => {
    const { getStorageProvider } = require("../src/services/storage");
    const provider = getStorageProvider();
    assert.equal(provider.provider, "local");
    assert.equal(typeof provider.saveBuffer, "function");
    assert.equal(typeof provider.deleteObject, "function");
  });

  it("local provider writes and deletes under upload dir", async () => {
    const local = require("../src/services/storage/localStorage");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mt-upload-"));
    const previous = process.env.UPLOAD_DIR;

    // localStorage reads env.uploadPath from loaded env module — write via
    // absolute key under the real upload path instead of mutating env.
    const key = `test-${Date.now()}.bin`;
    const saved = await local.saveBuffer(Buffer.from("hello-mt"), key, {
      contentType: "application/octet-stream",
    });
    assert.match(saved.fileUrl, /\/uploads\//);
    assert.equal(saved.storageKey, key);

    const absolute = path.join(
      require("../src/config/env").env.uploadPath,
      key,
    );
    const written = await fs.readFile(absolute);
    assert.equal(written.toString("utf8"), "hello-mt");

    await local.deleteObject(key);
    await assert.rejects(() => fs.access(absolute), { code: "ENOENT" });

    process.env.UPLOAD_DIR = previous;
    await fs.rm(dir, { recursive: true, force: true });
  });
});
