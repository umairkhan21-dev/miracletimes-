#!/usr/bin/env node
/**
 * Secure one-time admin bootstrap / password reset.
 * Usage:
 *   ADMIN_PASSWORD_FILE=/path/to/secret node scripts/create-admin.js --name "Desk Admin" --email admin@example.com
 *   ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD_FILE=... node scripts/create-admin.js
 *   node scripts/create-admin.js --email admin@example.com --reset-password  # + ADMIN_PASSWORD_FILE
 *
 * Prefer ADMIN_PASSWORD_FILE so the secret never appears in argv / process listings.
 * ADMIN_PASSWORD env is accepted; --password is rejected in production.
 *
 * Never log or echo the password. Do not use example/dev passwords in production.
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { getPool, closePool } = require("../src/config/database");

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readPassword() {
  const filePath = (process.env.ADMIN_PASSWORD_FILE || "").trim();
  if (filePath) {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  }
  if (readArg("--password")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Refusing --password on argv in production. Use ADMIN_PASSWORD_FILE.",
      );
    }
    return readArg("--password");
  }
  return process.env.ADMIN_PASSWORD || undefined;
}

async function main() {
  const resetPassword = hasFlag("--reset-password");
  const name = readArg("--name") || process.env.ADMIN_NAME;
  const email = readArg("--email") || process.env.ADMIN_EMAIL;
  let password;
  try {
    password = readPassword();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }

  if (!email || !password || (!resetPassword && !name)) {
    console.error(
      "Missing required values.\n" +
        "  Create:  --name --email + ADMIN_PASSWORD_FILE (or ADMIN_PASSWORD)\n" +
        "  Reset:   --email --reset-password + ADMIN_PASSWORD_FILE",
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const weak = /^(password|admin|changeme|change-me|secret|test)/i.test(
    password,
  );
  if (weak) {
    console.error("Password looks like an example/placeholder value. Choose a unique secret.");
    process.exit(1);
  }

  const pool = getPool();
  const [existing] = await pool.execute(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email],
  );

  if (resetPassword) {
    if (!existing.length) {
      console.error(`No user found for ${email}.`);
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
      `UPDATE users
       SET password_hash = ?, role = 'admin', is_active = 1, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [passwordHash, existing[0].id],
    );
    console.log(
      `Admin password reset successfully (id=${existing[0].id}, email=${email}).`,
    );
    return;
  }

  if (existing.length) {
    console.error(
      `User already exists for ${email} (id=${existing[0].id}, role=${existing[0].role}). ` +
        "Use --reset-password to rotate the password.",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'admin', 1)`,
    [name, email, passwordHash],
  );

  console.log(`Admin created successfully (id=${result.insertId}, email=${email}).`);
}

main()
  .catch((error) => {
    console.error("Failed to create admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
