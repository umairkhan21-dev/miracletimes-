const bcrypt = require("bcryptjs");
const { createApp } = require("../src/app");
const { getPool } = require("../src/config/database");
const { env } = require("../src/config/env");
const authService = require("../src/services/authService");

async function startTestServer() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function createTestUser({
  role,
  email = `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
  name = `Test ${role}`,
  password = "test-password-not-for-production",
} = {}) {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [name, email, passwordHash, role],
  );
  const id = Number(result.insertId);
  return {
    id,
    email,
    password,
    role,
    name,
    token: authService.signToken({
      id,
      email,
      role,
    }),
  };
}

async function deleteTestUser(userId) {
  if (!userId) return;
  await getPool().execute("DELETE FROM users WHERE id = ?", [userId]);
}

async function createDraftArticle({
  authorId,
  publicId,
  slug,
  title = "Authz draft",
  status = "draft",
  publishedAt = null,
  scheduledAt = null,
} = {}) {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO articles (
       public_id, author_id, status, featured, breaking, published_at, scheduled_at
     ) VALUES (?, ?, ?, 0, 0, ?, ?)`,
    [publicId, authorId, status, publishedAt, scheduledAt],
  );
  const articleId = Number(result.insertId);
  await pool.execute(
    `INSERT INTO article_translations
       (article_id, language_code, slug, title, summary, image_alt)
     VALUES (?, 'hi', ?, ?, 'Summary', 'alt')`,
    [articleId, slug, title],
  );
  const [cats] = await pool.execute(
    "SELECT id FROM categories ORDER BY id ASC LIMIT 1",
  );
  if (cats.length) {
    await pool.execute(
      "INSERT INTO article_categories (article_id, category_id) VALUES (?, ?)",
      [articleId, cats[0].id],
    );
  }
  return { articleId, categoryId: cats[0] ? Number(cats[0].id) : null };
}

async function deleteTestArticle(articleId) {
  if (!articleId) return;
  await getPool().execute("DELETE FROM articles WHERE id = ?", [articleId]);
}

function bearerHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Origin: env.FRONTEND_URL,
  };
}

function cookieHeaders(token) {
  return {
    Cookie: `${env.COOKIE_NAME}=${token}`,
    "Content-Type": "application/json",
    Origin: env.FRONTEND_URL,
  };
}

function sampleWritePayload({
  publicId,
  categoryId,
  status = "draft",
  slug,
  publishedAt,
  scheduledAt,
} = {}) {
  return {
    publicId,
    status,
    featured: false,
    breaking: false,
    categoryIds: categoryId ? [categoryId] : undefined,
    categorySlugs: categoryId ? undefined : ["business"],
    publishedAt: publishedAt ?? undefined,
    scheduledAt: scheduledAt ?? undefined,
    tags: ["security-test"],
    translations: [
      {
        languageCode: "hi",
        slug: slug || `hi-${publicId}`,
        title: "सुरक्षा परीक्षण",
        summary: "लेखक प्रकाशन बाईपास परीक्षण",
        content: [{ type: "p", text: "यह एक परीक्षण अनुच्छेद है।" }],
      },
      {
        languageCode: "en",
        slug: slug ? `${slug}-en` : `en-${publicId}`,
        title: "Security test",
        summary: "Author publish bypass test",
        content: [{ type: "p", text: "This is a test paragraph." }],
      },
    ],
  };
}

module.exports = {
  startTestServer,
  createTestUser,
  deleteTestUser,
  createDraftArticle,
  deleteTestArticle,
  bearerHeaders,
  cookieHeaders,
  sampleWritePayload,
};
