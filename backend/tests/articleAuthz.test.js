const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool, getPool } = require("../src/config/database");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  createDraftArticle,
  deleteTestArticle,
  bearerHeaders,
  sampleWritePayload,
} = require("./helpers");

describe("article authorization", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let authorA;
  let authorB;
  let editor;
  let ownedArticleId;
  let otherArticleId;
  let categoryId;
  const createdArticleIds = [];

  before(async () => {
    await verifyConnection();
    server = await startTestServer();
    authorA = await createTestUser({ role: "author", name: "Author A" });
    authorB = await createTestUser({ role: "author", name: "Author B" });
    editor = await createTestUser({ role: "editor", name: "Editor" });

    const owned = await createDraftArticle({
      authorId: authorA.id,
      publicId: `authz-owned-${Date.now()}`,
      slug: `authz-owned-${Date.now()}`,
      title: "Owned draft",
    });
    ownedArticleId = owned.articleId;
    categoryId = owned.categoryId;

    const other = await createDraftArticle({
      authorId: authorB.id,
      publicId: `authz-other-${Date.now()}`,
      slug: `authz-other-${Date.now()}`,
      title: "Other author draft",
    });
    otherArticleId = other.articleId;
  });

  after(async () => {
    for (const id of [...createdArticleIds, ownedArticleId, otherArticleId]) {
      await deleteTestArticle(id);
    }
    await deleteTestUser(authorA?.id);
    await deleteTestUser(authorB?.id);
    await deleteTestUser(editor?.id);
    await server.close();
    await closePool();
  });

  it("rejects author create with status=published", async () => {
    const publicId = `authz-create-pub-${Date.now()}`;
    const response = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(authorA.token),
      body: JSON.stringify(
        sampleWritePayload({
          publicId,
          categoryId,
          status: "published",
          publishedAt: new Date().toISOString(),
        }),
      ),
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("rejects author update that sets status=published", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/${ownedArticleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({ status: "published" }),
      },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "FORBIDDEN");

    const [rows] = await getPool().execute(
      "SELECT status FROM articles WHERE id = ?",
      [ownedArticleId],
    );
    assert.equal(rows[0].status, "draft");
  });

  it("rejects author schedule/publish route access", async () => {
    const publish = await fetch(
      `${server.baseUrl}/api/articles/${ownedArticleId}/publish`,
      {
        method: "POST",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({}),
      },
    );
    assert.equal(publish.status, 403);

    const schedule = await fetch(
      `${server.baseUrl}/api/articles/${ownedArticleId}/schedule`,
      {
        method: "POST",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({
          scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
        }),
      },
    );
    assert.equal(schedule.status, 403);
  });

  it("allows author to create a draft they own", async () => {
    const publicId = `authz-create-draft-${Date.now()}`;
    const response = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(authorA.token),
      body: JSON.stringify(
        sampleWritePayload({
          publicId,
          categoryId,
          status: "draft",
        }),
      ),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "draft");
    assert.equal(body.data.authorId, authorA.id);
    createdArticleIds.push(body.data.id);
  });

  it("scopes admin list to the author's own articles", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/admin?language=hi&limit=100`,
      { headers: bearerHeaders(authorA.token) },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));

    const ids = body.data.map((item) => Number(item.numericId));
    assert.ok(ids.includes(ownedArticleId));
    assert.equal(ids.includes(otherArticleId), false);
  });

  it("forbids author from reading another author's draft by id", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/admin/${otherArticleId}`,
      { headers: bearerHeaders(authorA.token) },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("allows author to read their own draft by id", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/admin/${ownedArticleId}`,
      { headers: bearerHeaders(authorA.token) },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.id, ownedArticleId);
    assert.equal(body.data.authorId, authorA.id);
  });

  it("allows editor to read any draft and publish", async () => {
    const detail = await fetch(
      `${server.baseUrl}/api/articles/admin/${otherArticleId}`,
      { headers: bearerHeaders(editor.token) },
    );
    assert.equal(detail.status, 200);

    const publish = await fetch(
      `${server.baseUrl}/api/articles/${ownedArticleId}/publish`,
      {
        method: "POST",
        headers: bearerHeaders(editor.token),
        body: JSON.stringify({}),
      },
    );
    assert.equal(publish.status, 200);
    const body = await publish.json();
    assert.equal(body.data.status, "published");

    // Restore draft for cleanup consistency with other assertions that may re-run in isolation.
    await getPool().execute(
      `UPDATE articles SET status = 'draft', published_at = NULL WHERE id = ?`,
      [ownedArticleId],
    );
  });

  it("allows author to edit their own draft", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/${ownedArticleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({
          translations: [
            {
              languageCode: "hi",
              slug: `authz-owned-edited-${Date.now()}`,
              title: "Owned draft edited",
              summary: "Updated by owner",
              content: [{ type: "p", text: "Draft body update" }],
            },
          ],
        }),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "draft");
    assert.equal(body.data.translations[0].title, "Owned draft edited");
  });

  it("forbids author from editing another author's draft", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/articles/${otherArticleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({
          translations: [
            {
              languageCode: "hi",
              slug: `hijack-${Date.now()}`,
              title: "Hijacked",
              summary: "Should fail",
              content: [{ type: "p", text: "nope" }],
            },
          ],
        }),
      },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("forbids author from editing their own published article", async () => {
    const stamp = Date.now();
    const published = await createDraftArticle({
      authorId: authorA.id,
      publicId: `authz-pub-${stamp}`,
      slug: `authz-pub-${stamp}`,
      title: "Owned published",
      status: "published",
      publishedAt: new Date(),
    });
    createdArticleIds.push(published.articleId);

    const response = await fetch(
      `${server.baseUrl}/api/articles/${published.articleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({
          translations: [
            {
              languageCode: "hi",
              slug: `authz-pub-edit-${stamp}`,
              title: "Should not change",
              summary: "Blocked",
              seoTitle: "SEO hijack",
              seoDescription: "SEO hijack desc",
              content: [{ type: "p", text: "Tampered body" }],
            },
          ],
          categoryIds: published.categoryId ? [published.categoryId] : undefined,
          featuredImageId: null,
        }),
      },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "FORBIDDEN");

    const [rows] = await getPool().execute(
      "SELECT title, seo_title FROM article_translations WHERE article_id = ? AND language_code = 'hi'",
      [published.articleId],
    );
    assert.equal(rows[0].title, "Owned published");
    assert.equal(rows[0].seo_title, null);
  });

  it("forbids author from editing their own scheduled article", async () => {
    const stamp = Date.now();
    const scheduled = await createDraftArticle({
      authorId: authorA.id,
      publicId: `authz-sched-${stamp}`,
      slug: `authz-sched-${stamp}`,
      title: "Owned scheduled",
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 3_600_000),
    });
    createdArticleIds.push(scheduled.articleId);

    const response = await fetch(
      `${server.baseUrl}/api/articles/${scheduled.articleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(authorA.token),
        body: JSON.stringify({
          translations: [
            {
              languageCode: "hi",
              slug: `authz-sched-edit-${stamp}`,
              title: "Scheduled hijack",
              summary: "Blocked",
              content: [{ type: "p", text: "Tampered" }],
            },
          ],
        }),
      },
    );
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "FORBIDDEN");
  });

  it("forbids author partial updates on published articles", async () => {
    const stamp = Date.now();
    const published = await createDraftArticle({
      authorId: authorA.id,
      publicId: `authz-partial-${stamp}`,
      slug: `authz-partial-${stamp}`,
      title: "Partial locked",
      status: "published",
      publishedAt: new Date(),
    });
    createdArticleIds.push(published.articleId);

    const attempts = [
      { tags: ["hijack"] },
      { featuredImageId: null },
      { categorySlugs: ["business"] },
      {
        translations: [
          {
            languageCode: "hi",
            slug: `authz-partial-seo-${stamp}`,
            title: "Partial locked",
            summary: "Summary",
            seoTitle: "new seo",
            seoDescription: "new desc",
            content: [{ type: "p", text: "x" }],
          },
        ],
      },
    ];

    for (const payload of attempts) {
      const response = await fetch(
        `${server.baseUrl}/api/articles/${published.articleId}`,
        {
          method: "PUT",
          headers: bearerHeaders(authorA.token),
          body: JSON.stringify(payload),
        },
      );
      assert.equal(
        response.status,
        403,
        `expected 403 for payload ${JSON.stringify(payload)}`,
      );
    }
  });

  it("allows editor to update a published article owned by an author", async () => {
    const stamp = Date.now();
    const published = await createDraftArticle({
      authorId: authorA.id,
      publicId: `authz-editor-pub-${stamp}`,
      slug: `authz-editor-pub-${stamp}`,
      title: "Editor may edit",
      status: "published",
      publishedAt: new Date(),
    });
    createdArticleIds.push(published.articleId);

    const response = await fetch(
      `${server.baseUrl}/api/articles/${published.articleId}`,
      {
        method: "PUT",
        headers: bearerHeaders(editor.token),
        body: JSON.stringify({
          translations: [
            {
              languageCode: "hi",
              slug: `authz-editor-pub-${stamp}`,
              title: "Editor updated published",
              summary: "Allowed",
              content: [{ type: "p", text: "Editor body" }],
            },
          ],
        }),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.translations[0].title, "Editor updated published");
  });
});
