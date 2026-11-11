/**
 * In-process JWT denylist used after logout.
 *
 * Tradeoff: entries are not shared across multiple Node processes. For a
 * single Contabo API process (systemd/pm2 one instance) this is sufficient.
 * Multi-instance deployments need a shared store (Redis/DB) — document that
 * before horizontal scaling.
 */

/** @type {Map<string, number>} jti -> expiry epoch ms */
const revokedUntil = new Map();

function prune(now = Date.now()) {
  for (const [jti, expiresAt] of revokedUntil) {
    if (expiresAt <= now) revokedUntil.delete(jti);
  }
}

function revokeJti(jti, expUnixSeconds) {
  if (!jti) return;
  const expiresAt =
    typeof expUnixSeconds === "number" && Number.isFinite(expUnixSeconds)
      ? expUnixSeconds * 1000
      : Date.now() + 24 * 60 * 60 * 1000;
  revokedUntil.set(String(jti), expiresAt);
  prune();
}

function isJtiRevoked(jti) {
  if (!jti) return false;
  prune();
  const expiresAt = revokedUntil.get(String(jti));
  if (expiresAt == null) return false;
  if (expiresAt <= Date.now()) {
    revokedUntil.delete(String(jti));
    return false;
  }
  return true;
}

/** Test helper — clears the denylist. */
function clearRevocations() {
  revokedUntil.clear();
}

module.exports = {
  revokeJti,
  isJtiRevoked,
  clearRevocations,
};
