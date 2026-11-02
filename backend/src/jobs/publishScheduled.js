const articleService = require("../services/articleService");
const logger = require("../utils/logger");

let running = false;
let timer = null;

async function runOnce() {
  if (running) {
    logger.warn("Scheduled publish job skipped because a previous run is still active");
    return [];
  }

  running = true;
  try {
    const publishedIds = await articleService.publishDueScheduledArticles();
    if (publishedIds.length) {
      logger.info("Published scheduled articles", { count: publishedIds.length, ids: publishedIds });
    }
    return publishedIds;
  } catch (error) {
    logger.error("Scheduled publish job failed", { message: error.message });
    throw error;
  } finally {
    running = false;
  }
}

function startScheduledPublisher(intervalMs) {
  if (timer) return;
  timer = setInterval(() => {
    runOnce().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  logger.info("Scheduled publisher started", { intervalMs });
}

function stopScheduledPublisher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  runOnce,
  startScheduledPublisher,
  stopScheduledPublisher,
};
