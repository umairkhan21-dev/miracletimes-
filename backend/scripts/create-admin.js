#!/usr/bin/env node
/**
 * Secure one-time admin bootstrap.
 * Usage:
 *   node scripts/create-admin.js --name "Desk Admin" --email admin@example.com --password '...'
 * Or set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in the environment.
 */
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

async function main() {
  const name = readArg("--name") || process.env.ADMIN_NAME;
  const email = readArg("--email") || process.env.ADMIN_EMAIL;
  const password = readArg("--password") || process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Missing required values. Provide --name, --email, --password (or ADMIN_* env vars).",
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  const pool = getPool();
  const [existing] = await pool.execute(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email],
  );

  if (existing.length) {
    console.error(`User already exists for ${email} (id=${existing[0].id}, role=${existing[0].role}).`);
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
