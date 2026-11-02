const { env } = require("../config/env");

function stamp() {
  return new Date().toISOString();
}

function info(message, meta) {
  if (meta !== undefined) {
    console.log(`[${stamp()}] INFO  ${message}`, sanitize(meta));
  } else {
    console.log(`[${stamp()}] INFO  ${message}`);
  }
}

function warn(message, meta) {
  if (meta !== undefined) {
    console.warn(`[${stamp()}] WARN  ${message}`, sanitize(meta));
  } else {
    console.warn(`[${stamp()}] WARN  ${message}`);
  }
}

function error(message, meta) {
  if (meta !== undefined) {
    console.error(`[${stamp()}] ERROR ${message}`, sanitize(meta));
  } else {
    console.error(`[${stamp()}] ERROR ${message}`);
  }
}

function sanitize(value) {
  if (!value || typeof value !== "object") return value;
  const clone = { ...value };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|authorization|cookie/i.test(key)) {
      clone[key] = "[redacted]";
    }
  }
  if (!env.isProduction && clone.stack) {
    return clone;
  }
  if (clone.stack && env.isProduction) {
    delete clone.stack;
  }
  return clone;
}

module.exports = { info, warn, error };
