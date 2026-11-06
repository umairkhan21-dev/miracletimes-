const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");

describe("site rebuild decisions", () => {
  it("rebuilds for publish and public updates only", () => {
    const {
      shouldRebuildForArticle,
    } = require("../src/services/siteRebuildService");

    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "draft",
        nextStatus: "published",
        action: "publish",
      }),
      true,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "published",
        nextStatus: "published",
        action: "update",
      }),
      true,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "draft",
        nextStatus: "draft",
        action: "update",
      }),
      false,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "draft",
        nextStatus: "draft",
        action: "delete",
      }),
      false,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "published",
        nextStatus: null,
        action: "delete",
      }),
      true,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "draft",
        nextStatus: "scheduled",
        action: "schedule",
      }),
      false,
    );
    assert.equal(
      shouldRebuildForArticle({
        previousStatus: "published",
        nextStatus: "archived",
        action: "archive",
      }),
      true,
    );
  });
});

describe("site rebuild hook queue", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("no-ops when FRONTEND_DEPLOY_HOOK_URL is unset", async () => {
    // Ensure module sees empty hook from already-loaded env (dev default).
    const {
      requestFrontendRebuild,
      resetFrontendRebuildState,
    } = require("../src/services/siteRebuildService");
    resetFrontendRebuildState();
    const result = await requestFrontendRebuild("test", { immediate: true });
    assert.equal(result.skipped, true);
    assert.equal(result.triggered, false);
  });

  it("redacts deploy hook URLs in logs", () => {
    const { redactHook } = require("../src/services/siteRebuildService");
    const redacted = redactHook(
      "https://api.vercel.com/v1/integrations/deploy/QmExampleSecret/hook",
    );
    assert.match(redacted, /^https:\/\/api\.vercel\.com\//);
    assert.doesNotMatch(redacted, /QmExampleSecret/);
  });
});
