/**
 * Parse JWT-style expiresIn values into milliseconds.
 * Aligns cookie maxAge with token lifetime.
 *
 * Supported forms (same family as jsonwebtoken / ms):
 * - number or digit-only string: seconds (e.g. 3600, "3600")
 * - unit suffix: Ns, Nm, Nh, Nd, Nw (e.g. "45s", "30m", "12h", "1d", "1w")
 * - day phrases: "2 days", "1 day"
 *
 * Bare digit strings are treated as **seconds** so env values like
 * JWT_EXPIRES_IN=86400 match intentional second-based config (unlike
 * jsonwebtoken's ms() treating "60" as 60ms).
 *
 * @param {string | number} value
 * @returns {number} duration in milliseconds
 */
function parseJwtExpiresInMs(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("expiresIn number must be a positive finite value (seconds)");
    }
    return Math.floor(value * 1000);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) {
    throw new Error("expiresIn must not be empty");
  }

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    if (seconds <= 0) {
      throw new Error("expiresIn seconds must be positive");
    }
    return seconds * 1000;
  }

  const dayPhrase = /^(\d+)\s*days?$/.exec(raw);
  if (dayPhrase) {
    return Number(dayPhrase[1]) * 24 * 60 * 60 * 1000;
  }

  const withUnit = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/.exec(raw);
  if (!withUnit) {
    throw new Error(
      'expiresIn must be seconds or a span like "60s", "30m", "12h", "1d", "1w"',
    );
  }

  const amount = Number(withUnit[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("expiresIn amount must be positive");
  }

  const unit = withUnit[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return Math.floor(amount * multipliers[unit]);
}

module.exports = { parseJwtExpiresInMs };
