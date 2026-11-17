const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool } = require("../src/config/database");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  deleteTestArticle,
  bearerHeaders,
  sampleWritePayload,
  singleLanguageWritePayload,
} = require("./helpers");

describe("single-language publishing and public feed filtering", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let editor;
  let categoryId;
  const createdArticleIds = [];
  const stamp = Date.now();

  before(async () => {
    await verifyConnection();
    server = await startTestServer();
    editor = await createTestUser({ role: "editor", name: "Lang Editor" });

    const probePublicId = `lang-probe-${stamp}`;
    const createRes = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(editor.token),
      body: JSON.stringify(
        singleLanguageWritePayload({
          publicId: probePublicId,
          languageCode: "hi",
          status: "draft",
        }),
      ),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    categoryId = created.data.categories[0]?.id || null;
    createdArticleIds.push(created.data.id);
  });

  after(async () => {
    for (const id of createdArticleIds) {
      await deleteTestArticle(id);
    }
    await deleteTestUser(editor?.id);
    if (server) await server.close();
    await closePool();
  });

  async function createAndTrack(payload) {
    const response = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(editor.token),
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    assert.equal(
      response.status,
      201,
      body?.error?.message || JSON.stringify(body),
    );
    createdArticleIds.push(body.data.id);
    return body.data;
  }

  it("admin creates and publishes a Hindi-only article without English", async () => {
    const publicId = `lang-hi-only-${stamp}`;
    const article = await createAndTrack(
      singleLanguageWritePayload({
        publicId,
        categoryId,
        languageCode: "hi",
        status: "draft",
        slug: `lang-hi-only-${stamp}`,
      }),
    );

    assert.equal(article.translations.length, 1);
    assert.equal(article.translations[0].languageCode, "hi");

    const publishRes = await fetch(
      `${server.baseUrl}/api/articles/${article.id}/publish`,
      {
        method: "POST",
        headers: bearerHeaders(editor.token),
        body: JSON.stringify({}),
      },
    );
    assert.equal(publishRes.status, 200);

    const publicRes = await fetch(
      `${server.baseUrl}/api/articles/lang-hi-only-${stamp}?language=hi`,
    );
    assert.equal(publicRes.status, 200);
    const publicBody = await publicRes.json();
    assert.equal(publicBody.data.language, "hi");
    assert.equal(publicBody.data.status, "published");
  });

  it("admin creates and publishes an English-only article without Hindi", async () => {
    const publicId = `lang-en-only-${stamp}`;
    const article = await createAndTrack(
      singleLanguageWritePayload({
        publicId,
        categoryId,
        languageCode: "en",
        status: "draft",
        slug: `lang-en-only-${stamp}`,
      }),
    );

    assert.equal(article.translations.length, 1);
    assert.equal(article.translations[0].languageCode, "en");

    const publishRes = await fetch(
      `${server.baseUrl}/api/articles/${article.id}/publish`,
      {
        method: "POST",
        headers: bearerHeaders(editor.token),
        body: JSON.stringify({}),
      },
    );
    assert.equal(publishRes.status, 200);

    const publicRes = await fetch(
      `${server.baseUrl}/api/articles/lang-en-only-${stamp}?language=hi`,
    );
    assert.equal(publicRes.status, 200);
    const publicBody = await publicRes.json();
    assert.equal(publicBody.data.language, "en");
  });

  it("Hindi mode returns both Hindi and English published articles", async () => {
    const marker = `FeedBoth ${stamp}`;
    const hiSlug = `lang-feed-hi-${stamp}`;
    const enSlug = `lang-feed-en-${stamp}`;

    const hiArticle = await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-feed-hi-${stamp}`,
        categoryId,
        languageCode: "hi",
        status: "published",
        slug: hiSlug,
        title: `${marker} Hindi`,
        publishedAt: new Date().toISOString(),
      }),
    );
    const enArticle = await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-feed-en-${stamp}`,
        categoryId,
        languageCode: "en",
        status: "published",
        slug: enSlug,
        title: `${marker} English`,
        publishedAt: new Date().toISOString(),
      }),
    );

    const listRes = await fetch(
      `${server.baseUrl}/api/articles?language=hi&limit=100&q=${encodeURIComponent(marker)}`,
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    const ids = new Set(listBody.data.map((item) => item.numericId));
    assert.equal(ids.has(hiArticle.id), true);
    assert.equal(ids.has(enArticle.id), true);
  });

  it("English mode returns only English published articles", async () => {
    const marker = `FeedEnglish ${stamp}`;
    const hiSlug = `lang-enmode-hi-${stamp}`;
    const enSlug = `lang-enmode-en-${stamp}`;

    const hiArticle = await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-enmode-hi-${stamp}`,
        categoryId,
        languageCode: "hi",
        status: "published",
        slug: hiSlug,
        title: `${marker} HindiOnly`,
        publishedAt: new Date().toISOString(),
      }),
    );
    const enArticle = await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-enmode-en-${stamp}`,
        categoryId,
        languageCode: "en",
        status: "published",
        slug: enSlug,
        title: `${marker} EnglishOnly`,
        publishedAt: new Date().toISOString(),
      }),
    );

    const listRes = await fetch(
      `${server.baseUrl}/api/articles?language=en&limit=100&q=${encodeURIComponent(marker)}`,
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    const ids = new Set(listBody.data.map((item) => item.numericId));
    assert.equal(ids.has(enArticle.id), true);
    assert.equal(ids.has(hiArticle.id), false);
    assert.equal(
      listBody.data.every((item) => item.language === "en"),
      true,
    );
  });

  it("draft articles never appear in public listings", async () => {
    const draft = await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-draft-${stamp}`,
        categoryId,
        languageCode: "en",
        status: "draft",
        slug: `lang-draft-${stamp}`,
      }),
    );

    const listRes = await fetch(
      `${server.baseUrl}/api/articles?language=hi&limit=100&q=lang-draft-${stamp}`,
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(
      listBody.data.some((item) => item.numericId === draft.id),
      false,
    );

    const bySlug = await fetch(
      `${server.baseUrl}/api/articles/lang-draft-${stamp}?language=en`,
    );
    assert.equal(bySlug.status, 404);
  });

  it("category and search filters respect Hindi/English feed rules", async () => {
    const hiSlug = `lang-cat-hi-${stamp}`;
    const enSlug = `lang-cat-en-${stamp}`;

    await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-cat-hi-${stamp}`,
        categoryId,
        languageCode: "hi",
        status: "published",
        slug: hiSlug,
        title: `UniqueHindiCat ${stamp}`,
        publishedAt: new Date().toISOString(),
      }),
    );
    await createAndTrack(
      singleLanguageWritePayload({
        publicId: `lang-cat-en-${stamp}`,
        categoryId,
        languageCode: "en",
        status: "published",
        slug: enSlug,
        title: `UniqueEnglishCat ${stamp}`,
        publishedAt: new Date().toISOString(),
      }),
    );

    const hiSearch = await fetch(
      `${server.baseUrl}/api/articles?language=hi&q=UniqueHindiCat%20${stamp}`,
    );
    const hiSearchBody = await hiSearch.json();
    assert.equal(hiSearchBody.data.length >= 1, true);

    const enSearchHi = await fetch(
      `${server.baseUrl}/api/articles?language=en&q=UniqueHindiCat%20${stamp}`,
    );
    const enSearchHiBody = await enSearchHi.json();
    assert.equal(enSearchHiBody.data.length, 0);

    const enSearchEn = await fetch(
      `${server.baseUrl}/api/articles?language=en&q=UniqueEnglishCat%20${stamp}`,
    );
    const enSearchEnBody = await enSearchEn.json();
    assert.equal(enSearchEnBody.data.length >= 1, true);

    const hiCategory = await fetch(
      `${server.baseUrl}/api/articles?language=hi&category=business&limit=100`,
    );
    const hiCategoryBody = await hiCategory.json();
    assert.equal(
      hiCategoryBody.data.some((item) => item.slug === hiSlug),
      true,
    );
    assert.equal(
      hiCategoryBody.data.some((item) => item.slug === enSlug),
      true,
    );

    const enCategory = await fetch(
      `${server.baseUrl}/api/articles?language=en&category=business&limit=100`,
    );
    const enCategoryBody = await enCategory.json();
    assert.equal(
      enCategoryBody.data.some((item) => item.slug === enSlug),
      true,
    );
    assert.equal(
      enCategoryBody.data.some((item) => item.slug === hiSlug),
      false,
    );
  });

  it("existing bilingual articles remain readable and editable", async () => {
    const publicId = `lang-bilingual-${stamp}`;
    const article = await createAndTrack(
      sampleWritePayload({
        publicId,
        categoryId,
        status: "published",
        slug: `lang-bilingual-${stamp}`,
        publishedAt: new Date().toISOString(),
      }),
    );

    assert.equal(article.translations.length, 2);

    const hiRes = await fetch(
      `${server.baseUrl}/api/articles/lang-bilingual-${stamp}?language=hi`,
    );
    assert.equal(hiRes.status, 200);
    const hiBody = await hiRes.json();
    assert.equal(hiBody.data.language, "hi");

    const enRes = await fetch(
      `${server.baseUrl}/api/articles/lang-bilingual-${stamp}-en?language=en`,
    );
    assert.equal(enRes.status, 200);
    const enBody = await enRes.json();
    assert.equal(enBody.data.language, "en");

    const updateRes = await fetch(`${server.baseUrl}/api/articles/${article.id}`, {
      method: "PUT",
      headers: bearerHeaders(editor.token),
      body: JSON.stringify({
        translations: [
          {
            languageCode: "en",
            slug: `lang-bilingual-${stamp}-en`,
            title: "Updated English bilingual",
            summary: "Still bilingual after single-language edit",
            content: [{ type: "p", text: "Updated English body." }],
          },
        ],
      }),
    });
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    const codes = updated.data.translations.map((item) => item.languageCode).sort();
    assert.deepEqual(codes, ["en", "hi"]);
    assert.equal(
      updated.data.translations.find((item) => item.languageCode === "en").title,
      "Updated English bilingual",
    );
  });

  it("rejects invalid and unauthorized article submissions", async () => {
    const invalidRes = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(editor.token),
      body: JSON.stringify({
        publicId: `lang-invalid-${stamp}`,
        status: "draft",
        categoryIds: categoryId ? [categoryId] : undefined,
        translations: [],
      }),
    });
    assert.equal(invalidRes.status, 400);

    const duplicateLangRes = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: bearerHeaders(editor.token),
      body: JSON.stringify({
        publicId: `lang-dup-${stamp}`,
        status: "draft",
        categoryIds: categoryId ? [categoryId] : undefined,
        translations: [
          {
            languageCode: "hi",
            slug: `lang-dup-a-${stamp}`,
            title: "One",
            summary: "Summary one",
            content: [{ type: "p", text: "Body one" }],
          },
          {
            languageCode: "hi",
            slug: `lang-dup-b-${stamp}`,
            title: "Two",
            summary: "Summary two",
            content: [{ type: "p", text: "Body two" }],
          },
        ],
      }),
    });
    assert.equal(duplicateLangRes.status, 400);

    const unauthRes = await fetch(`${server.baseUrl}/api/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        singleLanguageWritePayload({
          publicId: `lang-unauth-${stamp}`,
          categoryId,
          languageCode: "en",
        }),
      ),
    });
    assert.equal(unauthRes.status, 401);
  });
});
