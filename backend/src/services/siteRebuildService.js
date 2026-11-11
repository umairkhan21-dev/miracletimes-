/**
 * Compatibility shim — static rebuild hooks are replaced by on-demand
 * Next.js cache revalidation (`cacheRevalidateService`).
 *
 * Prefer importing `cacheRevalidateService` directly in new code.
 */
module.exports = require("./cacheRevalidateService");
