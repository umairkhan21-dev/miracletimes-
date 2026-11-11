const localStorage = require("./localStorage");

/**
 * Storage provider abstraction.
 *
 * STORAGE_PROVIDER=local (default) — writes under UPLOAD_DIR; URLs use PUBLIC_BASE_URL/uploads.
 * STORAGE_PROVIDER=s3 — S3-compatible (Cloudflare R2, Contabo Object Storage, AWS).
 *
 * Existing local media is never migrated or bulk-deleted by selecting S3.
 * Deletes attempt the active provider and also best-effort local unlink so
 * historical local keys can still be removed when an admin deletes a media row.
 */
function getStorageProvider() {
  const { env } = require("../../config/env");
  const mode = (env.STORAGE_PROVIDER || "local").toLowerCase();

  if (mode === "s3") {
    const s3Storage = require("./s3Storage");
    return {
      provider: "s3",
      async saveBuffer(buffer, storageKey, options) {
        return s3Storage.saveBuffer(buffer, storageKey, options);
      },
      async deleteObject(storageKey) {
        await s3Storage.deleteObject(storageKey);
        // Best-effort cleanup if an older row still pointed at local disk.
        await localStorage.deleteObject(storageKey);
      },
    };
  }

  return localStorage;
}

module.exports = { getStorageProvider };
