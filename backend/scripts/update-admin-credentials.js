#!/usr/bin/env node
/**
 * Interactively update ONE existing Miracle Times administrator's email + password.
 *
 * Designed for Contabo production (miracle_times). Preserves user id, role,
 * is_active, and all article ownership FKs (author_id).
 *
 * Usage (on the API host, with production DB env loaded — never commit secrets):
 *   cd /opt/miracletimes/backend
 *   set -a && . /etc/miracle-times/api.env && set +a
 *   node scripts/update-admin-credentials.js
 *
 * Security:
 * - Prompts on the TTY only (no argv / env passwords).
 * - Never logs passwords, hashes, or tokens.
 * - Refuses to create a second account.
 * - Refuses if the new email is already used by another user.
 * - Updates only email + password_hash on the matched admin row.
 *
 * Note: Changing email/password does not revoke outstanding JWTs by itself.
 * Follow the operator checklist (JWT_SECRET rotate + restart miracle-times-api).
 */
const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { getPool, closePool } = require("../src/config/database");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const EXPECTED_DB_NAME = "miracle_times";
const DEFAULT_CURRENT_EMAIL = "desk@miracletimes.in";

function assertNoCredentialArgv(argv = process.argv) {
  const banned = argv.slice(2).some((arg) => {
    const lower = String(arg).toLowerCase();
    return (
      lower === "--password" ||
      lower.startsWith("--password=") ||
      lower === "--new-password" ||
      lower.startsWith("--new-password=") ||
      lower === "admin_password" ||
      lower.startsWith("admin_password=")
    );
  });
  if (banned) {
    throw new Error(
      "Refusing password-related command-line arguments. Use interactive TTY prompts only.",
    );
  }
  if ((process.env.ADMIN_PASSWORD || "").trim()) {
    throw new Error(
      "Refusing ADMIN_PASSWORD env. Use interactive TTY prompts only.",
    );
  }
  if ((process.env.ADMIN_PASSWORD_FILE || "").trim()) {
    throw new Error(
      "Refusing ADMIN_PASSWORD_FILE. Use interactive TTY prompts only.",
    );
  }
}

function assertSafeDbName(dbName = process.env.DB_NAME) {
  const name = String(dbName || "").trim();
  if (name !== EXPECTED_DB_NAME) {
    throw new Error(
      `Refusing to run against DB_NAME=${name || "(empty)"}. Expected ${EXPECTED_DB_NAME} ` +
        "(Miracle Drugs and other databases must remain untouched).",
    );
  }
  return name;
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }
  if (email.length > 255) {
    throw new Error("Email address is too long.");
  }
  return email;
}

function normalizeEmail(email) {
  return validateEmail(String(email || "").trim().toLowerCase());
}

function validatePassword(password) {
  if (typeof password !== "string") {
    throw new Error("Password must be a string.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > 200) {
    throw new Error("Password is too long.");
  }
  if (/\s/.test(password)) {
    throw new Error("Password must not contain whitespace.");
  }
  if (/^(password|admin|changeme|change-me|secret|test)/i.test(password)) {
    throw new Error(
      "Password looks like an example/placeholder value. Choose a unique secret.",
    );
  }
}

function assertTty() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "This script must be run in an interactive terminal (TTY). " +
        "Do not pipe credentials or pass them on the command line.",
    );
  }
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(String(answer || "").trim()));
  });
}

/** Read a secret with echo disabled (raw TTY mode). Never logs the value. */
function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u0003") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        reject(new Error("Interrupted."));
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      // Ignore other control characters.
      if (char.charCodeAt(0) < 32) {
        return;
      }
      value += char;
    };

    stdin.on("data", onData);
  });
}

/**
 * Transactional update of a single active admin row.
 * Only mutates email + password_hash (+ updated_at). Preserves id/role/is_active.
 *
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {{ fromEmail: string, toEmail: string, passwordHash: string }} params
 */
async function updateAdminCredentials(connection, { fromEmail, toEmail, passwordHash }) {
  const from = normalizeEmail(fromEmail);
  const to = normalizeEmail(toEmail);
  if (!passwordHash || typeof passwordHash !== "string") {
    throw new Error("passwordHash is required.");
  }

  await connection.beginTransaction();
  try {
    const [admins] = await connection.execute(
      `SELECT id, email, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1
       FOR UPDATE`,
      [from],
    );

    if (!admins.length) {
      throw new Error(`No user found for ${from}.`);
    }

    const admin = admins[0];
    if (admin.role !== "admin") {
      throw new Error(
        `Refusing to update user id=${admin.id}: role is '${admin.role}', not 'admin'.`,
      );
    }
    if (!admin.is_active) {
      throw new Error(`Refusing to update inactive user id=${admin.id}.`);
    }

    if (to !== from) {
      const [conflicts] = await connection.execute(
        `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
        [to, admin.id],
      );
      if (conflicts.length) {
        throw new Error(
          `New email is already assigned to another account (id=${conflicts[0].id}).`,
        );
      }
    }

    // Preserve role and is_active; only rotate credentials.
    const [result] = await connection.execute(
      `UPDATE users
       SET email = ?,
           password_hash = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?
         AND email = ?
         AND role = 'admin'
         AND is_active = 1`,
      [to, passwordHash, admin.id, from],
    );

    if (result.affectedRows !== 1) {
      throw new Error(
        `Expected to update exactly 1 row; affected=${result.affectedRows}. Rolled back.`,
      );
    }

    // Confirm preserved fields (still within the same transaction).
    const [verifyRows] = await connection.execute(
      `SELECT id, email, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [admin.id],
    );
    const verified = verifyRows[0];
    if (
      !verified ||
      Number(verified.id) !== Number(admin.id) ||
      verified.email !== to ||
      verified.role !== "admin" ||
      !verified.is_active
    ) {
      throw new Error("Post-update verification failed. Rolled back.");
    }

    await connection.commit();
    return {
      id: Number(admin.id),
      fromEmail: from,
      toEmail: to,
      role: verified.role,
      isActive: Boolean(verified.is_active),
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

async function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main() {
  assertNoCredentialArgv();
  assertTty();
  assertSafeDbName();

  const rl = createInterface();
  let password = "";
  let passwordConfirm = "";
  try {
    console.log("Miracle Times — update existing administrator email + password");
    console.log(
      `Database target: ${EXPECTED_DB_NAME} (from env). No other DBs will be touched.`,
    );
    console.log("");

    const currentEmail = await question(
      rl,
      `Current admin email [${DEFAULT_CURRENT_EMAIL}]: `,
    );
    const fromEmail = normalizeEmail(currentEmail || DEFAULT_CURRENT_EMAIL);

    const newEmailRaw = await question(rl, "New admin email: ");
    const toEmail = normalizeEmail(newEmailRaw);

    if (toEmail === fromEmail) {
      const same = await question(
        rl,
        "New email matches current email. Update password only? [y/N]: ",
      );
      if (!/^y(es)?$/i.test(same)) {
        console.log("Aborted.");
        return;
      }
    }

    // Pause readline so raw-mode password entry owns stdin exclusively.
    rl.pause();
    password = await readHidden("New password (input hidden): ");
    passwordConfirm = await readHidden("Confirm new password: ");
    rl.resume();
    if (password !== passwordConfirm) {
      throw new Error("Passwords do not match.");
    }

    const confirm = await question(
      rl,
      `Type UPDATE to change admin ${fromEmail} → ${toEmail}: `,
    );
    if (confirm !== "UPDATE") {
      console.log("Aborted (confirmation not UPDATE).");
      return;
    }

    const passwordHash = await hashPassword(password);
    password = "";
    passwordConfirm = "";

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      const updated = await updateAdminCredentials(connection, {
        fromEmail,
        toEmail,
        passwordHash,
      });
      console.log(
        `Admin credentials updated (id=${updated.id}, email=${updated.fromEmail} → ${updated.toEmail}).`,
      );
      console.log(
        "Existing JWT cookies are NOT revoked by this change. " +
          "Rotate JWT_SECRET and restart miracle-times-api when ready.",
      );
    } finally {
      connection.release();
    }
  } finally {
    password = "";
    passwordConfirm = "";
    rl.close();
  }
}

module.exports = {
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  EXPECTED_DB_NAME,
  DEFAULT_CURRENT_EMAIL,
  assertNoCredentialArgv,
  assertSafeDbName,
  validateEmail,
  normalizeEmail,
  validatePassword,
  hashPassword,
  updateAdminCredentials,
};

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Failed:", error.message || String(error));
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}
