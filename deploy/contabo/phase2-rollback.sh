#!/usr/bin/env bash
# Miracle Times Phase 2 rollback — reverse bootstrap service/nginx changes.
# Does NOT delete MySQL data, uploads, env secrets, or /opt/miracletimes checkout.
# Does NOT modify Miracle Drugs.
#
#   sudo bash /home/deploy/mt-phase2/phase2-rollback.sh
set -euo pipefail

ENV_DIR="/etc/miracle-times"
BACKUP_DIR="/var/backups/miracletimes"
MARK="$ENV_DIR/.phase2_bootstrap_complete"
DRUGS_SITE_ENABLED="/etc/nginx/sites-enabled/miracledrugsindia"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(id -u)" -eq 0 ]] || die "run as root via sudo"

log "=== Rollback: stop Miracle Times units (leave Drugs running) ==="
systemctl stop miracle-times-web.service 2>/dev/null || true
systemctl stop miracle-times-api.service 2>/dev/null || true
systemctl disable miracle-times-web.service 2>/dev/null || true
systemctl disable miracle-times-api.service 2>/dev/null || true

log "=== Rollback: disable Miracle Times Nginx site links only ==="
rm -f /etc/nginx/sites-enabled/miracletimes.in
rm -f /etc/nginx/sites-enabled/api.miracletimes.in
# Keep sites-available + conf.d for inspection; remove shared conf.d to drop zones/upstreams.
if [[ -f /etc/nginx/conf.d/miracle-times-shared.conf ]]; then
  install -d -m 0750 "$BACKUP_DIR/nginx"
  cp -a /etc/nginx/conf.d/miracle-times-shared.conf \
    "$BACKUP_DIR/nginx/miracle-times-shared.conf.$(date -u +%Y%m%dT%H%M%SZ).pre-rollback"
  rm -f /etc/nginx/conf.d/miracle-times-shared.conf
fi

[[ -e "$DRUGS_SITE_ENABLED" ]] || die "Miracle Drugs nginx enabled site missing — fix Drugs before nginx reload"
nginx -t || die "nginx -t failed after disabling MT sites"
systemctl reload nginx

drugs="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health || true)"
[[ "$drugs" == "200" ]] || die "Miracle Drugs unhealthy after rollback ($drugs)"

rm -f "$MARK"
log "ROLLBACK_OK"
log "Preserved: MySQL database/user, /etc/miracle-times/*, /opt/miracletimes, uploads, sites-available MT files, systemd unit files."
log "To fully remove units later (optional): rm /etc/systemd/system/miracle-times-*.service && systemctl daemon-reload"
log "Data deletion is intentionally out of scope for this script."
