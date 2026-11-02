const localStorage = require("./localStorage");

/**
 * Storage provider abstraction.
 * Swap this module to introduce S3/R2 later without changing controllers.
 */
function getStorageProvider() {
  return localStorage;
}

module.exports = { getStorageProvider };
