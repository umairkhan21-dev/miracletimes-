#!/usr/bin/env node
/**
 * Local smoke test: run static export against the local API and verify
 * SEO + article body land in out/ without Contabo/rsync.
 *
 * Prerequisites: backend listening (default http://127.0.0.1:4001) with
 * published articles. Does not modify production hosts.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4001"
).replace(/\/$/, "");

const health = spawnSync("curl", ["-sf", "--max-time", "3", `${apiUrl}/api/health`], {
  encoding: "utf8",
});
if (health.status !== 0) {
  console.error(
    `[local-rebuild-smoke] API health check failed for ${apiUrl}. Start the backend first.`,
  );
  process.exit(1);
}

console.log(`[local-rebuild-smoke] exporting against ${apiUrl}`);
const build = spawnSync("npm", ["run", "build:export"], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: apiUrl,
    STATIC_EXPORT: "1",
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if ((build.status ?? 1) !== 0) {
  process.exit(build.status ?? 1);
}

const seo = spawnSync("npm", ["run", "test:seo"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if ((seo.status ?? 1) !== 0) {
  process.exit(seo.status ?? 1);
}

const robots = fs.readFileSync(path.join(root, "out", "robots.txt"), "utf8");
if (!/Disallow:\s*\/search\//.test(robots)) {
  console.error("[local-rebuild-smoke] robots.txt missing /search/ disallow");
  process.exit(1);
}

console.log("[local-rebuild-smoke] OK — out/ updated with SEO + body HTML");
process.exit(0);
