const { env } = require("../config/env");
const logger = require("../utils/logger");

/** Coalesce bursts of admin edits into one deploy trigger. */
const DEFAULT_DEBOUNCE_MS = 45_000;

let timer = null;
let pendingReason = null;
let inFlight = null;

function redactHook(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.slice(0, 12)}…`;
  } catch {
    return "[invalid-hook]";
  }
}

function isPublicStatus(status) {
  return status === "published";
}

/**
 * Decide whether a mutation should rebuild the static frontend.
 * Draft-only edits are skipped to avoid unnecessary deploys.
 */
function shouldRebuildForArticle({
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
    // Only when removing something that was already on the public site.
    return isPublicStatus(previousStatus);
  }
  return isPublicStatus(previousStatus) || isPublicStatus(nextStatus);
}

async function postDeployHook(hookUrl, reason) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Deploy hook HTTP ${response.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
      );
    }
    logger.info("Frontend rebuild triggered", {
      reason,
      hook: redactHook(hookUrl),
    });
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function flush() {
  const reason = pendingReason || "article.change";
  pendingReason = null;
  timer = null;

  const hookUrl = (env.FRONTEND_DEPLOY_HOOK_URL || "").trim();
  if (!hookUrl) {
    logger.info(
      "Frontend rebuild skipped (FRONTEND_DEPLOY_HOOK_URL not configured)",
      { reason },
    );
    return { triggered: false, reason, skipped: true };
  }

  if (inFlight) {
    await inFlight;
  }

  inFlight = postDeployHook(hookUrl, reason)
    .then(() => ({ triggered: true, reason }))
    .catch((error) => {
      logger.error("Frontend rebuild trigger failed", {
        reason,
        message: error instanceof Error ? error.message : String(error),
      });
      return { triggered: false, reason, error: true };
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Queue a debounced production frontend rebuild (Contabo rebuild webhook).
 * Safe no-op when FRONTEND_DEPLOY_HOOK_URL is unset.
 */
function requestFrontendRebuild(reason = "article.change", options = {}) {
  const debounceMs =
    typeof options.debounceMs === "number"
      ? options.debounceMs
      : env.FRONTEND_DEPLOY_DEBOUNCE_MS || DEFAULT_DEBOUNCE_MS;

  pendingReason = reason;
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

  logger.info("Frontend rebuild queued", { reason, debounceMs });
  return { queued: true, reason, debounceMs };
}

/** Test helper — clears debounce state. */
function resetFrontendRebuildState() {
  if (timer) clearTimeout(timer);
  timer = null;
  pendingReason = null;
  inFlight = null;
}

module.exports = {
  shouldRebuildForArticle,
  requestFrontendRebuild,
  resetFrontendRebuildState,
  redactHook,
  DEFAULT_DEBOUNCE_MS,
};
