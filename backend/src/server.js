const { createApp } = require("./app");
const { env } = require("./config/env");
const { verifyConnection, closePool } = require("./config/database");
const {
  startScheduledPublisher,
  stopScheduledPublisher,
} = require("./jobs/publishScheduled");
const logger = require("./utils/logger");

async function start() {
  try {
    const db = await verifyConnection();
    logger.info("Database connection verified", { database: db.database });
  } catch (error) {
    logger.error("Failed to connect to MySQL on startup", {
      message: error.message,
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
    });
    process.exit(1);
  }

  const app = createApp();
  // Empty LISTEN_HOST keeps Node's default (all interfaces) for PaaS/containers
  // that require 0.0.0.0. Set LISTEN_HOST=127.0.0.1 behind a VPS reverse proxy.
  const listenHost = env.LISTEN_HOST || undefined;
  const onListening = () => {
    logger.info(`Miracle Times API listening on port ${env.PORT}`, {
      env: env.NODE_ENV,
      host: listenHost || "(all interfaces)",
      frontend: env.FRONTEND_URL,
    });
    startScheduledPublisher(env.SCHEDULE_INTERVAL_MS);
  };
  const server = listenHost
    ? app.listen(env.PORT, listenHost, onListening)
    : app.listen(env.PORT, onListening);

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);
    stopScheduledPublisher();

    server.close(async (closeError) => {
      if (closeError) {
        logger.error("Error while closing HTTP server", {
          message: closeError.message,
        });
      }
      try {
        await closePool();
        logger.info("MySQL pool closed");
        process.exit(0);
      } catch (error) {
        logger.error("Error while closing MySQL pool", {
          message: error.message,
        });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
