const fs = require("fs/promises");
const path = require("path");
const { env } = require("../../config/env");

async function ensureUploadDir() {
  await fs.mkdir(env.uploadPath, { recursive: true });
}

async function saveBuffer(buffer, storageKey, _options = {}) {
  await ensureUploadDir();
  const absolute = path.join(env.uploadPath, storageKey);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return {
    storageKey,
    fileUrl: `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/uploads/${storageKey}`,
  };
}

async function deleteObject(storageKey) {
  if (!storageKey) return;
  const absolute = path.join(env.uploadPath, storageKey);
  try {
    await fs.unlink(absolute);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  provider: "local",
  saveBuffer,
  deleteObject,
};
