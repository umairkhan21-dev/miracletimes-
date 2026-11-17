const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  articleWriteSchema,
  articleUpdateSchema,
  publicListQuerySchema,
  adminListQuerySchema,
} = require("../src/validators/articleValidators");

describe("article validators for single-language publishing", () => {
  it("accepts Hindi-only create payloads", () => {
    const parsed = articleWriteSchema.parse({
      publicId: "story-hi-only",
      status: "draft",
      categorySlugs: ["business"],
      translations: [
        {
          languageCode: "hi",
          slug: "hindi-only-story",
          title: "केवल हिंदी",
          summary: "सारांश",
          content: [{ type: "p", text: "अनुच्छेद" }],
        },
      ],
    });
    assert.equal(parsed.translations.length, 1);
    assert.equal(parsed.translations[0].languageCode, "hi");
  });

  it("accepts English-only create payloads", () => {
    const parsed = articleWriteSchema.parse({
      publicId: "story-en-only",
      status: "published",
      categorySlugs: ["business"],
      translations: [
        {
          languageCode: "en",
          slug: "english-only-story",
          title: "English only",
          summary: "Summary",
          content: [{ type: "p", text: "Paragraph" }],
        },
      ],
    });
    assert.equal(parsed.translations.length, 1);
    assert.equal(parsed.translations[0].languageCode, "en");
  });

  it("rejects empty translations and duplicate language codes", () => {
    assert.throws(() =>
      articleWriteSchema.parse({
        publicId: "story-empty",
        categorySlugs: ["business"],
        translations: [],
      }),
    );

    assert.throws(() =>
      articleWriteSchema.parse({
        publicId: "story-dup",
        categorySlugs: ["business"],
        translations: [
          {
            languageCode: "hi",
            slug: "a",
            title: "A",
            summary: "A",
            content: [{ type: "p", text: "A" }],
          },
          {
            languageCode: "hi",
            slug: "b",
            title: "B",
            summary: "B",
            content: [{ type: "p", text: "B" }],
          },
        ],
      }),
    );
  });

  it("allows bilingual payloads and single-language updates", () => {
    const bilingual = articleWriteSchema.parse({
      publicId: "story-bi",
      categorySlugs: ["business"],
      translations: [
        {
          languageCode: "hi",
          slug: "bi-hi",
          title: "हिंदी",
          summary: "सारांश",
          content: [{ type: "p", text: "अनुच्छेद" }],
        },
        {
          languageCode: "en",
          slug: "bi-en",
          title: "English",
          summary: "Summary",
          content: [{ type: "p", text: "Paragraph" }],
        },
      ],
    });
    assert.equal(bilingual.translations.length, 2);

    const update = articleUpdateSchema.parse({
      translations: [
        {
          languageCode: "en",
          slug: "bi-en",
          title: "Updated English",
          summary: "Updated summary",
          content: [{ type: "p", text: "Updated body" }],
        },
      ],
    });
    assert.equal(update.translations.length, 1);
  });

  it("defaults public list language to hi and admin list language to all", () => {
    assert.equal(publicListQuerySchema.parse({}).language, "hi");
    assert.equal(adminListQuerySchema.parse({}).language, "all");
    assert.equal(adminListQuerySchema.parse({ language: "en" }).language, "en");
  });
});
