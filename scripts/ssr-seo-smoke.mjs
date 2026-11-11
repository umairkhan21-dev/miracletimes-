#!/usr/bin/env node
/**
 * Local SSR SEO + revalidation smoke (no static export / rebuild webhook).
 *
 * Prerequisites:
 *   - API running (default http://localhost:4001)
 *   - `npm run build && npm run start` OR an already-running `next start`
 *
 * Env:
 *   NEXT_PUBLIC_API_URL   API origin (default http://localhost:4001)
 *   SSR_BASE_URL          Next origin (default http://127.0.0.1:3000)
 *   REVALIDATE_TOKEN      Shared secret for /api/revalidate (optional; skips auth tests if unset)
 *   START_NEXT=1          Build + start Next for this smoke run
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001").replace(
  /\/$/,
  "",
);
const siteBase = (process.env.SSR_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const revalidateToken = (process.env.REVALIDATE_TOKEN || "").trim();

const HI_SLUG = "lucknow-smart-technology-urban-development-test-hi";
const EN_SLUG = "lucknow-smart-technology-urban-development-test";

let nextProc = null;

async function waitForUrl(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function maybeStartNext() {
  if (process.env.START_NEXT !== "1") return;
  await new Promise((resolve, reject) => {
    const build = spawn("npm", ["run", "build"], {
      cwd: root,
      env: { ...process.env, NEXT_PUBLIC_API_URL: apiBase },
      stdio: "inherit",
    });
    build.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`next build exited ${code}`)),
    );
  });

  nextProc = spawn(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiBase,
        REVALIDATE_TOKEN: revalidateToken || "local-ssr-smoke-revalidate-token-32chars",
      },
      stdio: "inherit",
    },
  );
  await waitForUrl(`${siteBase}/`);
}

async function shutdown() {
  if (!nextProc) return;
  nextProc.kill("SIGTERM");
  nextProc = null;
}

async function fetchText(pathname) {
  const response = await fetch(`${siteBase}${pathname}`);
  const text = await response.text();
  return { response, text, head: text.split("</head>")[0] || text };
}

test("ssr smoke setup", async (t) => {
  t.after(async () => {
    await shutdown();
  });

  try {
    await fetch(`${apiBase}/api/health`);
  } catch {
    t.skip(`API not reachable at ${apiBase}`);
    return;
  }

  try {
    await maybeStartNext();
    await waitForUrl(`${siteBase}/`);
  } catch (error) {
    t.skip(
      `Next.js not reachable at ${siteBase}: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
});

test("SSR Hindi article HTML includes SEO + body without rebuild", async (t) => {
  let page;
  try {
    page = await fetchText(`/news/${HI_SLUG}/`);
  } catch {
    t.skip("Next.js not running");
    return;
  }
  if (page.response.status === 404) {
    t.skip(`Article ${HI_SLUG} not published in local DB`);
    return;
  }
  assert.equal(page.response.status, 200);
  assert.match(page.head, /<title>/);
  assert.match(page.head, /rel="canonical"/);
  assert.match(page.head, /property="og:type" content="article"/);
  assert.match(page.text, /application\/ld\+json/);
  assert.match(page.text, /"@type":"NewsArticle"/);
  assert.match(page.text, /<h1>/);
  assert.match(page.text, /class="story-body"/);
  assert.match(page.text, /class="story-dek"/);
  assert.doesNotMatch(page.text, /खबरें लोड हो रही हैं/);
});

test("SSR English article HTML includes hreflang + body", async (t) => {
  let page;
  try {
    page = await fetchText(`/news/${EN_SLUG}/`);
  } catch {
    t.skip("Next.js not running");
    return;
  }
  if (page.response.status === 404) {
    t.skip(`Article ${EN_SLUG} not published in local DB`);
    return;
  }
  assert.equal(page.response.status, 200);
  assert.match(page.head, /hrefLang="en"/i);
  assert.match(page.head, /hrefLang="hi"/i);
  assert.match(page.text, /class="story-body"/);
  assert.match(page.text, /application\/ld\+json/);
});

test("SSR homepage embeds lead story content", async (t) => {
  let page;
  try {
    page = await fetchText(`/`);
  } catch {
    t.skip("Next.js not running");
    return;
  }
  assert.equal(page.response.status, 200);
  assert.match(page.text, /<html[^>]*lang="hi"/);
  assert.match(page.text, /application\/ld\+json/);
  // Should not be stuck on the client loading shell for the default locale.
  assert.doesNotMatch(page.text, /खबरें लोड हो रही हैं/);
});

test("dynamic sitemap and robots are served by Next", async (t) => {
  let robots;
  let sitemap;
  try {
    robots = await fetchText(`/robots.txt`);
    sitemap = await fetchText(`/sitemap.xml`);
  } catch {
    t.skip("Next.js not running");
    return;
  }
  assert.equal(robots.response.status, 200);
  assert.match(robots.text, /Disallow:\s*\/admin\//);
  assert.match(robots.text, /Sitemap:\s*https:\/\/miracletimes\.in\/sitemap\.xml/);
  assert.equal(sitemap.response.status, 200);
  assert.match(sitemap.text, /https:\/\/miracletimes\.in\//);
});

test("revalidate endpoint rejects missing/invalid token", async (t) => {
  let response;
  try {
    response = await fetch(`${siteBase}/api/revalidate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "smoke", tags: ["home"] }),
    });
  } catch {
    t.skip("Next.js not running");
    return;
  }
  assert.ok([401, 503].includes(response.status));
});

test("revalidate endpoint accepts valid token", async (t) => {
  const token =
    revalidateToken ||
    (process.env.START_NEXT === "1"
      ? "local-ssr-smoke-revalidate-token-32chars"
      : "");
  if (!token) {
    t.skip("REVALIDATE_TOKEN not set");
    return;
  }
  let response;
  try {
    response = await fetch(`${siteBase}/api/revalidate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Revalidate-Token": token,
      },
      body: JSON.stringify({
        reason: "smoke.test",
        tags: ["home", "articles", "sitemap"],
        paths: ["/"],
      }),
    });
  } catch {
    t.skip("Next.js not running");
    return;
  }
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.revalidated, true);
});

test("obsolete static export artifacts are not required", () => {
  // Smoke must not depend on out/ or build:export.
  assert.equal(typeof fs.existsSync, "function");
  assert.ok(fs.existsSync(path.join(root, "app/api/revalidate/route.ts")));
});
