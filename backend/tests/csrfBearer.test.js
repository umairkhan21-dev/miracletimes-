const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool } = require("../src/config/database");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  createDraftArticle,
  deleteTestArticle,
} = require("./helpers");

describe("CSRF Origin checks with Bearer auth", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let editor;
  let article;

  before(async () => {
    await verifyConnection();
    server = await startTestServer();
    editor = await createTestUser({ role: "editor", name: "CSRF Editor" });
    article = await createDraftArticle({
      authorId: editor.id,
      publicId: `csrf-${Date.now()}`,
      slug: `csrf-slug-${Date.now()}`,
    });
  });

  after(async () => {
    await deleteTestArticle(article?.articleId);
    await deleteTestUser(editor?.id);
    await server.close();
    await closePool();
  });

  it("rejects Bearer mutations from a disallowed Origin", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/${article.articleId}/archive`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editor.token}`,
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
      },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "CSRF_REJECTED");
  });

  it("allows Bearer mutations without Origin (non-browser clients)", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/${article.articleId}/archive`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editor.token}`,
          "Content-Type": "application/json",
        },
      },
    );
    assert.equal(response.status, 200);
  });
});
