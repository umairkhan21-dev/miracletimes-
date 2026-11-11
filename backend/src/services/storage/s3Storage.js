const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { env } = require("../../config/env");

let client = null;

function getClient() {
  if (client) return client;
  const endpoint = (env.S3_ENDPOINT || "").trim();
  const region = (env.S3_REGION || "auto").trim() || "auto";
  const accessKeyId = (env.S3_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (env.S3_SECRET_ACCESS_KEY || "").trim();

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage is selected but S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are incomplete",
    );
  }

  client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return client;
}

function publicUrlForKey(storageKey) {
  const base = (env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL is required when STORAGE_PROVIDER=s3");
  }
  return `${base}/${storageKey.replace(/^\//, "")}`;
}

async function saveBuffer(buffer, storageKey, options = {}) {
  const bucket = (env.S3_BUCKET || "").trim();
  if (!bucket) {
    throw new Error("S3_BUCKET is required when STORAGE_PROVIDER=s3");
  }

  const contentType = options.contentType || "application/octet-stream";
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      // Keep objects private at the bucket; serve via public CDN/base URL policy.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    storageKey,
    fileUrl: publicUrlForKey(storageKey),
  };
}

async function deleteObject(storageKey) {
  if (!storageKey) return;
  const bucket = (env.S3_BUCKET || "").trim();
  if (!bucket) return;

  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );
  } catch (error) {
    // Missing object is fine — never treat as fatal during media cleanup.
    if (error && (error.name === "NoSuchKey" || error.Code === "NoSuchKey")) {
      return;
    }
    throw error;
  }
}

/** Test helper */
function resetS3Client() {
  client = null;
}

module.exports = {
  provider: "s3",
  saveBuffer,
  deleteObject,
  resetS3Client,
  publicUrlForKey,
};
