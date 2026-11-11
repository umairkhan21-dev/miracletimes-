const crypto = require("crypto");
const dns = require("dns").promises;
const net = require("net");
const path = require("path");
const sharp = require("sharp");
const { query } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const { toIsoString } = require("../utils/datetime");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const { getStorageProvider } = require("./storage");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function mapMedia(row) {
  return {
    id: Number(row.id),
    fileUrl: row.file_url,
    storageKey: row.storage_key,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    uploadedBy: row.uploaded_by == null ? null : Number(row.uploaded_by),
    createdAt: toIsoString(row.created_at),
  };
}

function ipv4ToInt(ip) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function ipv4InCidr(ip, cidr, prefix) {
  const address = ipv4ToInt(ip);
  const base = ipv4ToInt(cidr);
  if (address == null || base == null) return false;
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  return (address & mask) === (base & mask);
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const normalized = String(ip).toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:0" ||
    normalized === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(normalized);
  if (mapped) return isPrivateIp(mapped[1]);

  if (net.isIP(normalized) === 4) {
    if (ipv4InCidr(normalized, "0.0.0.0", 8)) return true; // "this" network
    if (ipv4InCidr(normalized, "10.0.0.0", 8)) return true;
    if (ipv4InCidr(normalized, "127.0.0.0", 8)) return true;
    if (ipv4InCidr(normalized, "169.254.0.0", 16)) return true;
    if (ipv4InCidr(normalized, "172.16.0.0", 12)) return true;
    if (ipv4InCidr(normalized, "192.168.0.0", 16)) return true;
    if (ipv4InCidr(normalized, "100.64.0.0", 10)) return true; // CGNAT
    if (ipv4InCidr(normalized, "192.0.0.0", 24)) return true;
    if (ipv4InCidr(normalized, "192.0.2.0", 24)) return true; // TEST-NET-1
    if (ipv4InCidr(normalized, "198.51.100.0", 24)) return true; // TEST-NET-2
    if (ipv4InCidr(normalized, "203.0.113.0", 24)) return true; // TEST-NET-3
    if (ipv4InCidr(normalized, "198.18.0.0", 15)) return true; // benchmarking
    if (ipv4InCidr(normalized, "224.0.0.0", 4)) return true; // multicast
    if (ipv4InCidr(normalized, "240.0.0.0", 4)) return true; // reserved
    return false;
  }

  if (net.isIP(normalized) === 6) {
    if (normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("ff")) return true; // multicast
    if (
      normalized.startsWith("2001:db8:") ||
      normalized === "2001:db8::" ||
      normalized.startsWith("2001:db8::")
    ) {
      return true; // documentation
    }
    return false;
  }

  return true;
}

async function assertSafeRemoteUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError("Invalid image URL", 400, { code: "INVALID_URL" });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError("Only http and https image URLs are allowed", 400, {
      code: "INVALID_URL",
    });
  }

  if (parsed.username || parsed.password) {
    throw new AppError("Credentials in image URLs are not allowed", 400, {
      code: "INVALID_URL",
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new AppError("Internal hostnames are not allowed", 400, {
      code: "SSRF_BLOCKED",
    });
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new AppError("Private IP addresses are not allowed", 400, {
        code: "SSRF_BLOCKED",
      });
    }
    return parsed;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError("Unable to resolve image host", 400, {
      code: "INVALID_URL",
    });
  }

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new AppError("Resolved host points to a blocked address", 400, {
      code: "SSRF_BLOCKED",
    });
  }

  return parsed;
}

async function inspectImageBuffer(buffer) {
  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    throw new AppError("Uploaded file is not a valid image", 400, {
      code: "INVALID_IMAGE",
    });
  }

  const formatMime = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  }[metadata.format];

  if (!formatMime || !ALLOWED_MIME.has(formatMime)) {
    throw new AppError("Unsupported image format", 400, {
      code: "INVALID_IMAGE",
    });
  }

  if (!metadata.width || !metadata.height) {
    throw new AppError("Unable to determine image dimensions", 400, {
      code: "INVALID_IMAGE",
    });
  }

  if (metadata.width > 8000 || metadata.height > 8000) {
    throw new AppError("Image dimensions are too large", 400, {
      code: "INVALID_IMAGE",
    });
  }

  return {
    mimeType: formatMime,
    width: metadata.width,
    height: metadata.height,
  };
}

function buildStorageKey(mimeType, originalName) {
  const ext = MIME_TO_EXT[mimeType] || "bin";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const random = crypto.randomBytes(16).toString("hex");
  const safeBase = path
    .basename(originalName || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
  return `${stamp}/${random}-${safeBase || "image"}.${ext}`;
}

async function insertMedia(values) {
  const { getPool } = require("../config/database");
  const [result] = await getPool().execute(
    `INSERT INTO media (
       file_url, storage_key, original_filename, mime_type,
       file_size_bytes, width, height, uploaded_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      values.fileUrl,
      values.storageKey,
      values.originalFilename,
      values.mimeType,
      values.fileSizeBytes,
      values.width,
      values.height,
      values.uploadedBy,
    ],
  );
  return Number(result.insertId);
}

async function uploadImage({ buffer, originalFilename, declaredMime, uploadedBy }) {
  if (!buffer?.length) {
    throw new AppError("Empty upload", 400, { code: "INVALID_IMAGE" });
  }
  if (buffer.length > env.MAX_UPLOAD_BYTES) {
    throw new AppError("File exceeds upload size limit", 400, {
      code: "FILE_TOO_LARGE",
    });
  }
  if (declaredMime && !ALLOWED_MIME.has(declaredMime)) {
    throw new AppError("Unsupported MIME type", 400, { code: "INVALID_IMAGE" });
  }

  const inspected = await inspectImageBuffer(buffer);
  if (declaredMime && declaredMime !== inspected.mimeType) {
    throw new AppError("Declared MIME type does not match file contents", 400, {
      code: "INVALID_IMAGE",
    });
  }

  const storageKey = buildStorageKey(inspected.mimeType, originalFilename);
  const storage = getStorageProvider();
  const saved = await storage.saveBuffer(buffer, storageKey, {
    contentType: inspected.mimeType,
  });
  const id = await insertMedia({
    fileUrl: saved.fileUrl,
    storageKey: saved.storageKey,
    originalFilename: originalFilename || null,
    mimeType: inspected.mimeType,
    fileSizeBytes: buffer.length,
    width: inspected.width,
    height: inspected.height,
    uploadedBy,
  });

  return getMediaById(id);
}

async function registerExternalUrl({ url, uploadedBy }) {
  const parsed = await assertSafeRemoteUrl(url);
  const pathname = parsed.pathname.toLowerCase();
  if (pathname.endsWith(".svg")) {
    throw new AppError("SVG URLs are not allowed", 400, { code: "INVALID_IMAGE" });
  }

  let mimeType = "image/jpeg";
  if (pathname.endsWith(".png")) mimeType = "image/png";
  else if (pathname.endsWith(".webp")) mimeType = "image/webp";
  else if (pathname.endsWith(".avif")) mimeType = "image/avif";
  else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    mimeType = "image/jpeg";
  }

  const id = await insertMedia({
    fileUrl: parsed.toString(),
    storageKey: null,
    originalFilename: path.basename(parsed.pathname) || null,
    mimeType,
    fileSizeBytes: 0,
    width: null,
    height: null,
    uploadedBy,
  });

  return getMediaById(id);
}

async function getMediaById(id) {
  const rows = await query("SELECT * FROM media WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) {
    throw new AppError("Media not found", 404, { code: "NOT_FOUND" });
  }
  return mapMedia(rows[0]);
}

async function listMedia({ page = 1, limit = 20 } = {}) {
  const pagination = parsePagination({ page, limit });
  const countRows = await query("SELECT COUNT(*) AS total FROM media");
  const rows = await query(
    `SELECT * FROM media
     ORDER BY created_at DESC, id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
  );
  return {
    media: rows.map(mapMedia),
    meta: paginationMeta(Number(countRows[0].total), pagination.page, pagination.limit),
  };
}

async function deleteMedia(id, actor) {
  const media = await getMediaById(id);
  const role = actor?.role;
  const isPrivileged = role === "admin" || role === "editor";
  const ownerId = media.uploadedBy == null ? null : Number(media.uploadedBy);
  const actorId = actor?.id == null ? null : Number(actor.id);

  // Authors may delete only their own uploads. Admin/editor may delete any.
  // Legacy rows with null uploaded_by require admin/editor.
  if (!isPrivileged) {
    if (ownerId == null || actorId == null || ownerId !== actorId) {
      throw new AppError("Insufficient permissions", 403, { code: "FORBIDDEN" });
    }
  }

  const refs = await query(
    "SELECT id FROM articles WHERE featured_image_id = ? LIMIT 1",
    [id],
  );
  if (refs.length) {
    throw new AppError("Media is still referenced by an article", 409, {
      code: "MEDIA_IN_USE",
    });
  }

  const { getPool } = require("../config/database");
  await getPool().execute("DELETE FROM media WHERE id = ?", [id]);

  if (media.storageKey) {
    await getStorageProvider().deleteObject(media.storageKey);
  }
  return true;
}

module.exports = {
  uploadImage,
  registerExternalUrl,
  getMediaById,
  listMedia,
  deleteMedia,
  ALLOWED_MIME,
  assertSafeRemoteUrl,
};
