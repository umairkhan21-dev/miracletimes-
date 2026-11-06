#!/usr/bin/env node
/**
 * Production static export.
 * Next.js forbids `dynamicParams: true` with `output: "export"`, but local
 * preview needs `true` for newly published article slugs. This script flips
 * the flag for the export build, then restores it.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patchExportedHtmlLang } from "./patch-html-lang.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = path.join(root, "app", "(site)", "news", "[slug]", "page.tsx");
const original = fs.readFileSync(pageFile, "utf8");
const patched = original.replace(
  /export const dynamicParams = true;/,
  "export const dynamicParams = false;",
);

if (patched === original) {
  console.error(
    "Could not patch app/(site)/news/[slug]/page.tsx for static export.",
  );
  process.exit(1);
}

/** Load KEY=VALUE pairs from a dotenv file into process.env (no override). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim();
if (!apiUrl) {
  console.error(
    "NEXT_PUBLIC_API_URL is required for static export so article slugs and metadata can be fetched.",
  );
  process.exit(1);
}
if (/localhost|127\.0\.0\.1/i.test(apiUrl)) {
  console.warn(
    `[static-export] NEXT_PUBLIC_API_URL is ${apiUrl}. Open Graph images resolved from this host will be omitted from HTML; use the production API URL for deploy builds.`,
  );
}

// Drop leftover Next Data Cache so published slug lists / metadata cannot go
// stale across export builds (`lib/api.ts` uses force-cache for static export).
fs.rmSync(path.join(root, ".next", "cache"), {
  recursive: true,
  force: true,
});

fs.writeFileSync(pageFile, patched);

const result = spawnSync("npx", ["next", "build"], {
  cwd: root,
  env: { ...process.env, STATIC_EXPORT: "1", NODE_ENV: "production" },
  stdio: "inherit",
  shell: process.platform === "win32",
});

fs.writeFileSync(pageFile, original);

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const outDir = path.join(root, "out");
if (!fs.existsSync(outDir)) {
  console.error("Static export finished without an out/ directory.");
  process.exit(1);
}

const langPatch = patchExportedHtmlLang(outDir);
console.log(
  `[static-export] html lang patched: scanned=${langPatch.scanned} changed=${langPatch.patched}`,
);

process.exit(0);
