#!/usr/bin/env bash
# Phase 3A — enable Miracle Times HTTPS Nginx vhosts (Contabo).
# Uses Cloudflare Origin Certificate at /etc/ssl/miracletimes/.
# Does NOT change Cloudflare DNS, Vercel, or Miracle Drugs.
#
# Run ONLY after operator review:
#   sudo bash /home/deploy/mt-phase2/phase3a-enable-https.sh
set -euo pipefail

STAGING="${STAGING:-/home/deploy/mt-phase2}"
BACKUP_DIR="/var/backups/miracletimes/nginx"
CERT_DIR="/etc/ssl/miracletimes"
CERT_PEM="$CERT_DIR/origin.pem"
CERT_KEY="$CERT_DIR/origin.key"
DRUGS_SITE="/etc/nginx/sites-available/miracledrugsindia"
DRUGS_ENABLED="/etc/nginx/sites-enabled/miracledrugsindia"
SITE_MT="/etc/nginx/sites-available/miracletimes.in"
SITE_API="/etc/nginx/sites-available/api.miracletimes.in"
MT_BAK=""
API_BAK=""
CONFIGS_REPLACED=0

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
stamp() { date -u +%Y%m%dT%H%M%SZ; }

restore_mt_sites_from_backup() {
  if [[ "$CONFIGS_REPLACED" -eq 1 && -n "$MT_BAK" && -n "$API_BAK" && -f "$MT_BAK" && -f "$API_BAK" ]]; then
    log "Restoring Miracle Times Nginx sites from pre-HTTPS backups..."
    cp -a "$MT_BAK" "$SITE_MT"
    cp -a "$API_BAK" "$SITE_API"
    ln -sfn "$SITE_MT" /etc/nginx/sites-enabled/miracletimes.in
    ln -sfn "$SITE_API" /etc/nginx/sites-enabled/api.miracletimes.in
    if nginx -t; then
      systemctl reload nginx || true
      log "Restored previous Miracle Times Nginx configuration"
    else
      log "WARNING: restored files but nginx -t still failing — manual intervention required"
    fi
  fi
}

on_error() {
  local code=$?
  log "Phase 3A failed (exit $code)"
  restore_mt_sites_from_backup
  exit "$code"
}
trap on_error ERR

[[ "$(id -u)" -eq 0 ]] || die "run as root via sudo"

[[ -f "$STAGING/nginx-miracletimes.in.conf" ]] || die "missing $STAGING/nginx-miracletimes.in.conf"
[[ -f "$STAGING/nginx-api.miracletimes.in.conf" ]] || die "missing $STAGING/nginx-api.miracletimes.in.conf"
[[ -f "$CERT_PEM" ]] || die "missing certificate $CERT_PEM"
[[ -f "$CERT_KEY" ]] || die "missing private key $CERT_KEY"
[[ -e "$DRUGS_ENABLED" ]] || die "Miracle Drugs nginx site missing — aborting"
[[ -f /etc/nginx/conf.d/miracle-times-shared.conf ]] || die "missing miracle-times-shared.conf"

# Refuse to touch Drugs paths.
case "$CERT_DIR$CERT_PEM$CERT_KEY$SITE_MT$SITE_API" in
  *miracledrugsindia*) die "refusing Drugs path in Miracle Times variables" ;;
esac

DRUGS_SHA_BEFORE="$(sha256sum "$DRUGS_SITE" | awk '{print $1}')"

log "=== Preflight: certificate validity + coverage (no private key printed) ==="
openssl x509 -in "$CERT_PEM" -noout -subject -issuer -dates
SAN_LINE="$(openssl x509 -in "$CERT_PEM" -noout -ext subjectAltName 2>/dev/null || true)"
if [[ -n "$SAN_LINE" ]]; then
  log "SAN: $SAN_LINE"
fi
CERT_TEXT="$(openssl x509 -in "$CERT_PEM" -noout -text)"

# Apex must appear; www and api may be explicit or covered by *.miracletimes.in
echo "$CERT_TEXT" | grep -Eq 'DNS:miracletimes\.in(,|$| )|CN[[:space:]]*=[[:space:]]*miracletimes\.in' \
  || echo "$CERT_TEXT" | grep -q 'DNS:miracletimes.in' \
  || die "certificate missing miracletimes.in"
echo "$CERT_TEXT" | grep -Eq 'DNS:www\.miracletimes\.in|DNS:\*\.miracletimes\.in' \
  || die "certificate missing www.miracletimes.in (or *.miracletimes.in wildcard)"
echo "$CERT_TEXT" | grep -Eq 'DNS:api\.miracletimes\.in|DNS:\*\.miracletimes\.in' \
  || die "certificate missing api.miracletimes.in (or *.miracletimes.in wildcard)"

# NotBefore / NotAfter window
openssl x509 -in "$CERT_PEM" -noout -checkend 0 >/dev/null \
  || die "certificate is not currently valid (expired or not yet valid)"

log "=== Preflight: certificate/private-key match (pubkey hashes only) ==="
CERT_PUB_HASH="$(openssl x509 -in "$CERT_PEM" -noout -pubkey \
  | openssl pkey -pubin -outform DER 2>/dev/null | openssl dgst -sha256 | awk '{print $NF}')"
KEY_PUB_HASH="$(openssl pkey -in "$CERT_KEY" -pubout -outform DER 2>/dev/null \
  | openssl dgst -sha256 | awk '{print $NF}')"
[[ -n "$CERT_PUB_HASH" && -n "$KEY_PUB_HASH" ]] || die "unable to derive public-key hashes"
[[ "$CERT_PUB_HASH" == "$KEY_PUB_HASH" ]] || die "certificate and private key do not match"
log "Public-key SHA256 match OK (${CERT_PUB_HASH:0:12}…)"

log "=== Ensure nginx can traverse cert directory (key remains 600) ==="
# Match Drugs layout: dir 755, pem 644, key 600 root:root.
chmod 755 "$CERT_DIR"
chmod 644 "$CERT_PEM"
chmod 600 "$CERT_KEY"
chown root:root "$CERT_DIR" "$CERT_PEM" "$CERT_KEY"
stat -c '%U:%G %a %n' "$CERT_DIR" "$CERT_PEM" "$CERT_KEY"
[[ "$(stat -c '%a' "$CERT_KEY")" == "600" ]] || die "private key mode is not 600"
[[ "$(stat -c '%U:%G' "$CERT_KEY")" == "root:root" ]] || die "private key owner is not root:root"

# Confirm www-data can traverse + read pem (without reading key contents).
sudo -u www-data test -r "$CERT_PEM" || die "www-data cannot read certificate pem"
sudo -u www-data test -x "$CERT_DIR" || die "www-data cannot traverse certificate directory"
# Key must NOT be world-readable; nginx master (root) reads it at start.
[[ "$(stat -c '%a' "$CERT_KEY")" == "600" ]] || die "key permissions drifted"

log "=== Preflight: Miracle Times + Drugs health ==="
api="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4001/api/health || true)"
web="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000/ || true)"
drugs="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health || true)"
[[ "$api" == "200" ]] || die "Times API health=$api"
[[ "$web" == "200" ]] || die "Times web health=$web"
[[ "$drugs" == "200" ]] || die "Drugs health=$drugs"

install -d -m 0750 "$BACKUP_DIR"
TS="$(stamp)"
log "=== Backup current MT Nginx sites ==="
MT_BAK="$BACKUP_DIR/miracletimes.in.${TS}.pre-https.bak"
API_BAK="$BACKUP_DIR/api.miracletimes.in.${TS}.pre-https.bak"
cp -a "$SITE_MT" "$MT_BAK"
cp -a "$SITE_API" "$API_BAK"
log "Backups: $MT_BAK ; $API_BAK"

log "=== Install HTTPS site files (Miracle Times only) ==="
install -m 0644 "$STAGING/nginx-miracletimes.in.conf" "$SITE_MT"
install -m 0644 "$STAGING/nginx-api.miracletimes.in.conf" "$SITE_API"
ln -sfn "$SITE_MT" /etc/nginx/sites-enabled/miracletimes.in
ln -sfn "$SITE_API" /etc/nginx/sites-enabled/api.miracletimes.in
CONFIGS_REPLACED=1

[[ -e "$DRUGS_ENABLED" ]] || die "Drugs site disappeared before reload"
DRUGS_SHA_AFTER="$(sha256sum "$DRUGS_SITE" | awk '{print $1}')"
[[ "$DRUGS_SHA_BEFORE" == "$DRUGS_SHA_AFTER" ]] || die "Drugs nginx file changed unexpectedly"

log "=== nginx -t (auto-restore on failure) ==="
nginx -t

log "=== Reload nginx ==="
systemctl reload nginx

# Successful reload — do not auto-restore on later probe failures; operator can rollback.
CONFIGS_REPLACED=0
trap - ERR

log "=== Private HTTPS checks via --resolve (no public DNS change) ==="
IP=127.0.0.1
for url in \
  "https://miracletimes.in/" \
  "https://www.miracletimes.in/" \
  "https://api.miracletimes.in/api/health"
 do
  host="$(printf '%s' "$url" | sed -E 's#https://([^/]+)/.*#\1#')"
  code="$(curl -sk --resolve "${host}:443:${IP}" -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true)"
  log "$code  $url  (--resolve ${host}:443:${IP})"
  case "$url" in
    *api.miracletimes.in*)
      [[ "$code" == "200" ]] || die "API HTTPS check failed ($code) — run phase3a-rollback-https.sh if needed"
      ;;
    *www.miracletimes.in*)
      [[ "$code" == "301" || "$code" == "302" || "$code" == "200" ]] || die "www HTTPS check failed ($code)"
      ;;
    *)
      [[ "$code" == "200" ]] || die "site HTTPS check failed ($code) — run phase3a-rollback-https.sh if needed"
      ;;
  esac
done

drugs2="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health || true)"
[[ "$drugs2" == "200" ]] || die "Drugs unhealthy after HTTPS enable ($drugs2)"

ss -lnt | grep -E ':3000\b' | grep -q '127.0.0.1:3000' || die "port 3000 not loopback"
ss -lnt | grep -E ':4001\b' | grep -q '127.0.0.1:4001' || die "port 4001 not loopback"
ss -lnt | grep -E ':4000\b' | grep -q '127.0.0.1:4000' || die "port 4000 not loopback"

log "PHASE3A_HTTPS_OK"
log "Rollback: sudo bash $STAGING/phase3a-rollback-https.sh"
log "Public DNS / Vercel unchanged. Next: approve DNS cutover separately."
