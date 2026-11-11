const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");

describe("cache revalidation decisions", () => {
  it("revalidates for publish and public updates only", () => {
    const {
      shouldRevalidateForArticle,
    } = require("../src/services/cacheRevalidateService");

    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "draft",
        nextStatus: "published",
        action: "publish",
      }),
      true,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "published",
        nextStatus: "published",
        action: "update",
      }),
      true,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "draft",
        nextStatus: "draft",
        action: "update",
      }),
      false,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "draft",
        nextStatus: "draft",
        action: "delete",
      }),
      false,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "published",
        nextStatus: null,
        action: "delete",
      }),
      true,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "draft",
        nextStatus: "scheduled",
        action: "schedule",
      }),
      false,
    );
    assert.equal(
      shouldRevalidateForArticle({
        previousStatus: "published",
        nextStatus: "archived",
        action: "archive",
      }),
      true,
    );
  });

  it("builds tags and paths for article slugs", () => {
    const { buildPayload } = require("../src/services/cacheRevalidateService");
    const payload = buildPayload({
      reason: "article.publish",
      slugs: ["lucknow-test-hi", "lucknow-test"],
      categories: ["lucknow"],
    });
    assert.ok(payload.tags.includes("home"));
    assert.ok(payload.tags.includes("article:lucknow-test-hi"));
    assert.ok(payload.tags.includes("category:lucknow"));
    assert.ok(payload.paths.includes("/news/lucknow-test/"));
    assert.ok(payload.paths.includes("/category/lucknow/"));
  });
});

describe("cache revalidation queue", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("no-ops when CACHE_REVALIDATE_URL is unset", async () => {
    const {
      requestCacheRevalidation,
      resetCacheRevalidateState,
    } = require("../src/services/cacheRevalidateService");
    resetCacheRevalidateState();
    const result = await requestCacheRevalidation("test", { immediate: true });
    assert.equal(result.skipped, true);
    assert.equal(result.triggered, false);
  });

  it("redacts revalidate URLs in logs", () => {
    const { redactUrl } = require("../src/services/cacheRevalidateService");
    const redacted = redactUrl(
      "http://127.0.0.1:3000/api/revalidate?secret=should-not-appear",
    );
    assert.match(redacted, /^http:\/\/127\.0\.0\.1:3000\//);
    assert.doesNotMatch(redacted, /should-not-appear/);
  });
});
