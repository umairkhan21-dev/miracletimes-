#!/usr/bin/env node
/**
 * Contabo rebuild webhook for Miracle Times static export.
 * Listens on 127.0.0.1 only. Nginx proxies /hooks/rebuild → this process.
 *
 * Required env (via /etc/miracle-times/rebuild.env):
 *   REBUILD_HOOK_TOKEN   shared secret (query ?token= or header X-Rebuild-Token)
 *   REBUILD_LISTEN_PORT  default 4010
 *   REPO_DIR             default /opt/miracletimes
 *   SITE_OUT_DIR         default /var/www/miracletimes/out
 *   NEXT_PUBLIC_API_URL  production HTTPS API origin (http://localhost allowed only
 *                        when ALLOW_INSECURE_API_URL=1 for local dry-runs)
 *   REBUILD_DEBOUNCE_MS  coalesce webhook bursts (default 5000; API also debounces)
 *   REBUILD_SKIP_NPM_CI  set to 1 to skip `npm ci` (faster local/dev loops)
 *   REBUILD_LOG_DIR      optional directory for rebuild-failures.log
 *
 * Does not touch Miracle Drugs paths.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.REBUILD_LISTEN_PORT || 4010);
const TOKEN = (process.env.REBUILD_HOOK_TOKEN || "").trim();
const REPO_DIR = process.env.REPO_DIR || "/opt/miracletimes";
const SITE_OUT_DIR = process.env.SITE_OUT_DIR || "/var/www/miracletimes/out";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const DEBOUNCE_MS = Math.max(
  0,
  Number(process.env.REBUILD_DEBOUNCE_MS || 5000) || 5000,
);
const SKIP_NPM_CI = process.env.REBUILD_SKIP_NPM_CI === "1";
const ALLOW_INSECURE_API = process.env.ALLOW_INSECURE_API_URL === "1";
const LOG_DIR =
  process.env.REBUILD_LOG_DIR || path.join(REPO_DIR, "deploy", "contabo", "logs");

if (!TOKEN || TOKEN.length < 24) {
  console.error("REBUILD_HOOK_TOKEN must be set (≥24 chars)");
  process.exit(1);
}
if (!API_URL) {
  console.error("NEXT_PUBLIC_API_URL is required");
  process.exit(1);
}
if (!/^https:\/\//i.test(API_URL)) {
  const localHttp =
    ALLOW_INSECURE_API &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(API_URL.replace(/\/$/, ""));
  if (!localHttp) {
    console.error(
      "NEXT_PUBLIC_API_URL must be https:// (or localhost http with ALLOW_INSECURE_API_URL=1)",
    );
    process.exit(1);
  }
}

/** @type {boolean} */
let busy = false;
/** @type {boolean} */
let rerunRequested = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;
/** @type {string | null} */
let lastError = null;
/** @type {string | null} */
let lastSuccessAt = null;

function tokensEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

function appendFailureLog(message) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(path.join(LOG_DIR, "rebuild-failures.log"), line, "utf8");
  } catch (error) {
    console.error(
      "[rebuild] could not write failure log",
      error instanceof Error ? error.message : error,
    );
  }
}

async function rebuild() {
  if (!SKIP_NPM_CI) {
    await run("npm", ["ci"], { cwd: REPO_DIR, env: process.env });
  }
  await run("npm", ["run", "build:export"], {
    cwd: REPO_DIR,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: API_URL,
      STATIC_EXPORT: "1",
      NODE_ENV: "production",
    },
  });
  const outDir = path.join(REPO_DIR, "out");
  if (!fs.existsSync(outDir)) {
    throw new Error("Static export missing out/");
  }
  fs.mkdirSync(path.dirname(SITE_OUT_DIR), { recursive: true });
  // Atomic-ish publish: sync to a sibling temp dir then swap when possible.
  const stagingDir = `${SITE_OUT_DIR}.staging`;
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });
  await run("rsync", ["-a", `${outDir}/`, `${stagingDir}/`], {
    cwd: REPO_DIR,
  });
  // Replace live tree contents without deleting the mount point.
  await run("rsync", ["-a", "--delete", `${stagingDir}/`, `${SITE_OUT_DIR}/`], {
    cwd: REPO_DIR,
  });
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

function scheduleRebuild(reason) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runRebuildCycle(reason);
  }, DEBOUNCE_MS);
  if (typeof debounceTimer.unref === "function") debounceTimer.unref();
  console.log(
    `[rebuild] scheduled reason=${reason} debounceMs=${DEBOUNCE_MS}`,
  );
}

async function runRebuildCycle(reason) {
  if (busy) {
    rerunRequested = true;
    console.log(`[rebuild] busy — will re-run after current build (${reason})`);
    return;
  }

  busy = true;
  const started = Date.now();
  console.log(`[rebuild] start reason=${reason}`);
  try {
    await rebuild();
    lastSuccessAt = new Date().toISOString();
    lastError = null;
    console.log(
      `[rebuild] success reason=${reason} durationMs=${Date.now() - started} at=${lastSuccessAt}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    lastError = message;
    console.error(`[rebuild] failed reason=${reason}`, message);
    appendFailureLog(`reason=${reason} error=${message}`);
  } finally {
    busy = false;
    if (rerunRequested) {
      rerunRequested = false;
      scheduleRebuild("queued-rerun");
    }
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 64_000) {
        resolve(Buffer.alloc(0));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && (req.url || "").startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        busy,
        rerunRequested,
        lastSuccessAt,
        lastError,
      }),
    );
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405).end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname !== "/hooks/rebuild" && url.pathname !== "/") {
    res.writeHead(404).end("Not Found");
    return;
  }

  await readBody(req);
  const provided =
    url.searchParams.get("token") ||
    req.headers["x-rebuild-token"] ||
    "";
  if (!tokensEqual(provided, TOKEN)) {
    res.writeHead(401).end("Unauthorized");
    return;
  }

  const reason = url.searchParams.get("reason") || "hook";
  scheduleRebuild(reason);
  res.writeHead(202, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      accepted: true,
      busy,
      debounceMs: DEBOUNCE_MS,
      queuedRerun: busy,
    }),
  );
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Miracle Times rebuild webhook on 127.0.0.1:${PORT}`);
});
