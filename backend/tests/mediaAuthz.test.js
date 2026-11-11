const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { verifyConnection, closePool, getPool } = require("../src/config/database");
const {
  startTestServer,
  createTestUser,
  deleteTestUser,
  bearerHeaders,
} = require("./helpers");

async function insertMedia({ uploadedBy, fileUrl = "https://api.miracletimes.in/uploads/test.jpg" }) {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO media (
       file_url, storage_key, original_filename, mime_type,
       file_size_bytes, width, height, uploaded_by
     ) VALUES (?, NULL, 'test.jpg', 'image/jpeg', 0, 10, 10, ?)`,
    [fileUrl, uploadedBy],
  );
  return Number(result.insertId);
}

async function deleteMediaRow(id) {
  if (!id) return;
  await getPool().execute("DELETE FROM media WHERE id = ?", [id]);
}

describe("media delete authorization", () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let server;
  let authorA;
  let authorB;
  let editor;
  let mediaOwnedByA;
  let mediaOwnedByB;

  before(async () => {
    await verifyConnection();
    server = await startTestServer();
    authorA = await createTestUser({ role: "author", name: "Author A" });
    authorB = await createTestUser({ role: "author", name: "Author B" });
    editor = await createTestUser({ role: "editor", name: "Editor" });
    mediaOwnedByA = await insertMedia({ uploadedBy: authorA.id });
    mediaOwnedByB = await insertMedia({ uploadedBy: authorB.id });
  });

  after(async () => {
    await deleteMediaRow(mediaOwnedByA);
    await deleteMediaRow(mediaOwnedByB);
    await deleteTestUser(authorA?.id);
    await deleteTestUser(authorB?.id);
    await deleteTestUser(editor?.id);
    await server.close();
    await closePool();
  });

  it("forbids an author from deleting another author's unused media", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/media/${mediaOwnedByA}`,
      {
        method: "DELETE",
        headers: bearerHeaders(authorB.token),
      },
    );
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "FORBIDDEN");

    const [rows] = await getPool().execute(
      "SELECT id FROM media WHERE id = ? LIMIT 1",
      [mediaOwnedByA],
    );
    assert.equal(rows.length, 1);
  });

  it("allows an author to delete their own unused media", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/media/${mediaOwnedByB}`,
      {
        method: "DELETE",
        headers: bearerHeaders(authorB.token),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    mediaOwnedByB = null;
  });

  it("allows an editor to delete another user's unused media", async () => {
    const response = await fetch(
      `${server.baseUrl}/api/media/${mediaOwnedByA}`,
      {
        method: "DELETE",
        headers: bearerHeaders(editor.token),
      },
    );
    assert.equal(response.status, 200);
    mediaOwnedByA = null;
  });
});
