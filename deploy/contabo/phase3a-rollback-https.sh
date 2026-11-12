#!/usr/bin/env bash
# Phase 3A rollback — restore Miracle Times HTTP private Nginx vhosts.
# Does NOT delete origin certificates, change DNS, or touch Miracle Drugs.
set -euo pipefail

STAGING="${STAGING:-/home/deploy/mt-phase2}"
BACKUP_DIR="/var/backups/miracletimes/nginx"
DRUGS_ENABLED="/etc/nginx/sites-enabled/miracledrugsindia"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(id -u)" -eq 0 ]] || die "run as root via sudo"
[[ -e "$DRUGS_ENABLED" ]] || die "Miracle Drugs nginx site missing"

# Prefer explicit HTTP private templates from staging; else newest backup.
if [[ -f "$STAGING/nginx-miracletimes.in.http-private.conf" && -f "$STAGING/nginx-api.miracletimes.in.http-private.conf" ]]; then
  install -m 0644 "$STAGING/nginx-miracletimes.in.http-private.conf" /etc/nginx/sites-available/miracletimes.in
  install -m 0644 "$STAGING/nginx-api.miracletimes.in.http-private.conf" /etc/nginx/sites-available/api.miracletimes.in
  log "Restored HTTP private templates from staging"
else
  mt_bak="$(ls -1t "$BACKUP_DIR"/miracletimes.in.*.pre-https.bak 2>/dev/null | head -1 || true)"
  api_bak="$(ls -1t "$BACKUP_DIR"/api.miracletimes.in.*.pre-https.bak 2>/dev/null | head -1 || true)"
  [[ -n "$mt_bak" && -n "$api_bak" ]] || die "no staging HTTP templates and no pre-https backups"
  cp -a "$mt_bak" /etc/nginx/sites-available/miracletimes.in
  cp -a "$api_bak" /etc/nginx/sites-available/api.miracletimes.in
  log "Restored from backups: $mt_bak ; $api_bak"
fi

ln -sfn /etc/nginx/sites-available/miracletimes.in /etc/nginx/sites-enabled/miracletimes.in
ln -sfn /etc/nginx/sites-available/api.miracletimes.in /etc/nginx/sites-enabled/api.miracletimes.in

nginx -t
systemctl reload nginx

drugs="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health || true)"
[[ "$drugs" == "200" ]] || die "Drugs unhealthy after rollback ($drugs)"

log "PHASE3A_ROLLBACK_OK"
log "Origin certs under /etc/ssl/miracletimes/ were left in place."
