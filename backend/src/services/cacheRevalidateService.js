const { env } = require("../config/env");
const logger = require("../utils/logger");

/** Coalesce bursts of admin edits into one revalidation request. */
const DEFAULT_DEBOUNCE_MS = 5_000;

let timer = null;
let pending = null;
let inFlight = null;

function isPublicStatus(status) {
  return status === "published";
}

/**
 * Decide whether a mutation should invalidate the public Next.js cache.
 * Draft-only edits are skipped.
 */
function shouldRevalidateForArticle({
  previousStatus,
  nextStatus,
  action,
} = {}) {
  if (action === "schedule") {
    // Goes live later via the scheduled publisher job.
    return false;
  }
  if (action === "publish") {
    return true;
  }
  if (action === "delete" || action === "archive") {
    return isPublicStatus(previousStatus);
  }
  return isPublicStatus(previousStatus) || isPublicStatus(nextStatus);
}

/** @deprecated Use shouldRevalidateForArticle — kept for test/compat aliases. */
const shouldRebuildForArticle = shouldRevalidateForArticle;

function redactUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.slice(0, 24)}…`;
  } catch {
    return "[invalid-revalidate-url]";
  }
}

function defaultTagsForReason(reason) {
  const tags = new Set(["home", "articles", "latest", "sitemap", "feed"]);
  if (typeof reason === "string" && reason.includes("category:")) {
    const match = /category:([a-z0-9-]+)/i.exec(reason);
    if (match) tags.add(`category:${match[1]}`);
  }
  return Array.from(tags);
}

function buildPayload(entry) {
  const tags = new Set([
    ...(entry.tags || defaultTagsForReason(entry.reason)),
  ]);
  const paths = new Set(entry.paths || []);

  if (entry.slugs) {
    for (const slug of entry.slugs) {
      if (!slug) continue;
      tags.add(`article:${slug}`);
      paths.add(`/news/${slug}/`);
    }
  }
  if (entry.categories) {
    for (const category of entry.categories) {
      if (!category) continue;
      tags.add(`category:${category}`);
      paths.add(`/category/${category}/`);
    }
  }

  // Listing surfaces always refresh on public mutations.
  tags.add("home");
  tags.add("articles");
  tags.add("latest");
  tags.add("sitemap");
  tags.add("feed");
  paths.add("/");
  paths.add("/latest/");
  paths.add("/sitemap.xml");
  paths.add("/feed.xml/");

  return {
    reason: entry.reason || "article.change",
    tags: Array.from(tags),
    paths: Array.from(paths),
  };
}

function mergePending(next) {
  if (!pending) {
    pending = {
      reason: next.reason,
      tags: new Set(next.tags || []),
      paths: new Set(next.paths || []),
      slugs: new Set(next.slugs || []),
      categories: new Set(next.categories || []),
    };
    return;
  }
  pending.reason = next.reason || pending.reason;
  for (const tag of next.tags || []) pending.tags.add(tag);
  for (const path of next.paths || []) pending.paths.add(path);
  for (const slug of next.slugs || []) pending.slugs.add(slug);
  for (const category of next.categories || []) pending.categories.add(category);
}

async function postRevalidate(url, token, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Revalidate-Token": token,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Revalidate HTTP ${response.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
      );
    }
    logger.info("Frontend cache revalidated", {
      reason: payload.reason,
      tags: payload.tags?.length || 0,
      paths: payload.paths?.length || 0,
      target: redactUrl(url),
    });
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function flush() {
  const entry = pending;
  pending = null;
  timer = null;

  const url = (env.CACHE_REVALIDATE_URL || "").trim();
  const token = (env.CACHE_REVALIDATE_TOKEN || "").trim();
  if (!url || !token) {
    logger.info(
      "Frontend cache revalidation skipped (CACHE_REVALIDATE_URL/TOKEN not configured)",
      { reason: entry?.reason || "article.change" },
    );
    return { triggered: false, reason: entry?.reason, skipped: true };
  }

  const payload = buildPayload({
    reason: entry?.reason,
    tags: entry ? Array.from(entry.tags) : undefined,
    paths: entry ? Array.from(entry.paths) : undefined,
    slugs: entry ? Array.from(entry.slugs) : undefined,
    categories: entry ? Array.from(entry.categories) : undefined,
  });

  if (inFlight) {
    await inFlight;
  }

  inFlight = postRevalidate(url, token, payload)
    .then(() => ({ triggered: true, reason: payload.reason, payload }))
    .catch((error) => {
      logger.error("Frontend cache revalidation failed", {
        reason: payload.reason,
        message: error instanceof Error ? error.message : String(error),
      });
      return { triggered: false, reason: payload.reason, error: true };
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Queue a debounced production cache revalidation (Next.js /api/revalidate).
 * Safe no-op when CACHE_REVALIDATE_URL or CACHE_REVALIDATE_TOKEN is unset.
 */
function requestCacheRevalidation(reason = "article.change", options = {}) {
  const debounceMs =
    typeof options.debounceMs === "number"
      ? options.debounceMs
      : env.CACHE_REVALIDATE_DEBOUNCE_MS || DEFAULT_DEBOUNCE_MS;

  mergePending({
    reason,
    tags: options.tags,
    paths: options.paths,
    slugs: options.slugs,
    categories: options.categories,
  });

  if (timer) {
    clearTimeout(timer);
  }

  if (options.immediate) {
    return flush();
  }

  timer = setTimeout(() => {
    flush().catch(() => {});
  }, debounceMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  logger.info("Frontend cache revalidation queued", { reason, debounceMs });
  return { queued: true, reason, debounceMs };
}

/** @deprecated Prefer requestCacheRevalidation */
function requestFrontendRebuild(reason = "article.change", options = {}) {
  return requestCacheRevalidation(reason, options);
}

/** Test helper — clears debounce state. */
function resetCacheRevalidateState() {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  inFlight = null;
}

/** @deprecated Prefer resetCacheRevalidateState */
const resetFrontendRebuildState = resetCacheRevalidateState;

module.exports = {
  shouldRevalidateForArticle,
  shouldRebuildForArticle,
  requestCacheRevalidation,
  requestFrontendRebuild,
  resetCacheRevalidateState,
  resetFrontendRebuildState,
  redactUrl,
  redactHook: redactUrl,
  buildPayload,
  DEFAULT_DEBOUNCE_MS,
};
