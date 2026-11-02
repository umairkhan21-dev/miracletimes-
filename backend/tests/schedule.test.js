const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getPool, closePool, verifyConnection } = require("../src/config/database");
const { publishDueScheduledArticles } = require("../src/services/articleService");
const { runOnce } = require("../src/jobs/publishScheduled");

describe("scheduled publishing", () => {
  let articleId;

  before(async () => {
    await verifyConnection();
    const pool = getPool();
    const publicId = `schedule-test-${Date.now()}`;
    const [result] = await pool.execute(
      `INSERT INTO articles (public_id, author_id, status, featured, breaking, scheduled_at)
       VALUES (?, 1, 'scheduled', 0, 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE))`,
      [publicId],
    );
    articleId = Number(result.insertId);
    await pool.execute(
      `INSERT INTO article_translations
         (article_id, language_code, slug, title, summary, image_alt)
       VALUES (?, 'hi', ?, 'Schedule test', 'Summary', 'alt')`,
      [articleId, `schedule-test-${articleId}`],
    );
  });

  after(async () => {
    if (articleId) {
      await getPool().execute("DELETE FROM articles WHERE id = ?", [articleId]);
    }
    await closePool();
  });

  it("publishes due scheduled articles once", async () => {
    const first = await runOnce();
    assert.ok(first.includes(articleId));

    const [rows] = await getPool().execute(
      "SELECT status, published_at, scheduled_at FROM articles WHERE id = ?",
      [articleId],
    );
    assert.equal(rows[0].status, "published");
    assert.ok(rows[0].published_at);
    assert.equal(rows[0].scheduled_at, null);

    const second = await publishDueScheduledArticles();
    assert.equal(second.includes(articleId), false);
  });
});
