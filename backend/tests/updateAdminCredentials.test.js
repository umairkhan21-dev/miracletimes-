const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { verifyConnection, getPool, closePool } = require("../src/config/database");
const {
  assertNoCredentialArgv,
  assertSafeDbName,
  normalizeEmail,
  validatePassword,
  hashPassword,
  updateAdminCredentials,
  BCRYPT_ROUNDS,
  EXPECTED_DB_NAME,
} = require("../scripts/update-admin-credentials");
const { createTestUser, deleteTestUser } = require("./helpers");

describe("update-admin-credentials validators", () => {
  it("requires DB_NAME miracle_times", () => {
    assert.equal(assertSafeDbName("miracle_times"), "miracle_times");
    assert.throws(() => assertSafeDbName(""), /Expected miracle_times/);
    assert.throws(() => assertSafeDbName("miracledrugsindia"), /Expected miracle_times/);
    assert.equal(EXPECTED_DB_NAME, "miracle_times");
  });

  it("refuses password argv and ADMIN_PASSWORD env", () => {
    assert.doesNotThrow(() =>
      assertNoCredentialArgv(["node", "script.js"]),
    );
    assert.throws(
      () => assertNoCredentialArgv(["node", "script.js", "--password", "x"]),
      /command-line/,
    );
    const previous = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = "should-not-be-used-here";
    try {
      assert.throws(() => assertNoCredentialArgv(["node", "script.js"]), /ADMIN_PASSWORD/);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = previous;
    }
  });

  it("normalizes and validates email", () => {
    assert.equal(normalizeEmail(" Desk@MiracleTimes.in "), "desk@miracletimes.in");
    assert.throws(() => normalizeEmail("not-an-email"), /Invalid email/);
    assert.throws(() => normalizeEmail(""), /Invalid email/);
  });

  it("enforces strong password rules", () => {
    assert.throws(() => validatePassword("short"), /at least/);
    assert.throws(() => validatePassword("password12345"), /placeholder/);
    assert.throws(() => validatePassword("has spaces here1"), /whitespace/);
    assert.doesNotThrow(() =>
      validatePassword("unique-operator-secret-92"),
    );
  });

  it("hashes with the same bcrypt cost as create-admin", async () => {
    const password = "unique-operator-secret-92";
    const hash = await hashPassword(password);
    assert.equal(typeof hash, "string");
    assert.match(hash, /^\$2[aby]?\$/);
    assert.equal(BCRYPT_ROUNDS, 12);
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.equal(await bcrypt.compare("wrong-password-xx", hash), false);
  });
});

describe("update-admin-credentials transactional update", () => {
  /** @type {{ id: number, email: string, password: string, role: string } | undefined} */
  let admin;
  /** @type {{ id: number, email: string } | undefined} */
  let other;
  let articleId;

  before(async () => {
    await verifyConnection();
    admin = await createTestUser({
      role: "admin",
      name: "Cred Update Admin",
      password: "original-admin-pass-99",
    });
    other = await createTestUser({
      role: "author",
      name: "Other User",
      password: "other-user-pass-99xx",
    });

    const pool = getPool();
    const [articleResult] = await pool.execute(
      `INSERT INTO articles (
         public_id, author_id, status, featured, breaking, published_at, scheduled_at
       ) VALUES (?, ?, 'draft', 0, 0, NULL, NULL)`,
      [`cred-update-${Date.now()}`, admin.id],
    );
    articleId = Number(articleResult.insertId);
  });

  after(async () => {
    const pool = getPool();
    if (articleId) {
      await pool.execute("DELETE FROM articles WHERE id = ?", [articleId]);
    }
    await deleteTestUser(other?.id);
    await deleteTestUser(admin?.id);
    await closePool();
  });

  it("updates only the target admin email/password and preserves id/role/ownership", async () => {
    const pool = getPool();
    const connection = await pool.getConnection();
    const nextEmail = `admin-rotated-${Date.now()}@example.test`;
    const nextPassword = "rotated-admin-secret-42";
    try {
      const passwordHash = await hashPassword(nextPassword);
      const updated = await updateAdminCredentials(connection, {
        fromEmail: admin.email,
        toEmail: nextEmail,
        passwordHash,
      });

      assert.equal(updated.id, admin.id);
      assert.equal(updated.toEmail, nextEmail);
      assert.equal(updated.role, "admin");
      assert.equal(updated.isActive, true);

      const [rows] = await pool.execute(
        `SELECT id, email, role, is_active, password_hash FROM users WHERE id = ?`,
        [admin.id],
      );
      assert.equal(rows.length, 1);
      assert.equal(Number(rows[0].id), admin.id);
      assert.equal(rows[0].email, nextEmail);
      assert.equal(rows[0].role, "admin");
      assert.equal(Boolean(rows[0].is_active), true);
      assert.equal(await bcrypt.compare(nextPassword, rows[0].password_hash), true);
      assert.equal(
        await bcrypt.compare("original-admin-pass-99", rows[0].password_hash),
        false,
      );

      const [owned] = await pool.execute(
        `SELECT author_id FROM articles WHERE id = ?`,
        [articleId],
      );
      assert.equal(Number(owned[0].author_id), admin.id);

      // Keep subsequent tests / cleanup using the rotated email.
      admin.email = nextEmail;
    } finally {
      connection.release();
    }
  });

  it("rejects a new email already used by another account", async () => {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      const passwordHash = await hashPassword("another-unique-secret-77");
      await assert.rejects(
        () =>
          updateAdminCredentials(connection, {
            fromEmail: admin.email,
            toEmail: other.email,
            passwordHash,
          }),
        /already assigned/,
      );

      const [rows] = await pool.execute(
        `SELECT email, role FROM users WHERE id = ?`,
        [admin.id],
      );
      assert.equal(rows[0].email, admin.email);
      assert.equal(rows[0].role, "admin");
    } finally {
      connection.release();
    }
  });

  it("refuses to update a non-admin user", async () => {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      const passwordHash = await hashPassword("should-not-apply-999");
      await assert.rejects(
        () =>
          updateAdminCredentials(connection, {
            fromEmail: other.email,
            toEmail: `author-should-fail-${Date.now()}@example.test`,
            passwordHash,
          }),
        /not 'admin'/,
      );
    } finally {
      connection.release();
    }
  });
});
