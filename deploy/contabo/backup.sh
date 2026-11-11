#!/usr/bin/env bash
# Miracle Times backup — DB + uploads. Does not touch Miracle Drugs paths.
# Install: copy to /usr/local/bin/miracle-times-backup.sh and cron daily.
set -euo pipefail

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/miracletimes}"
DB_NAME="${DB_NAME:-miracle_times}"
DB_USER="${DB_USER:-miracle_times}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/miracletimes/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_ROOT"
umask 077

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "DB_PASSWORD must be set in the environment" >&2
  exit 1
fi

mysqldump -u "$DB_USER" -p"$DB_PASSWORD" --single-transaction --routines --triggers \
  "$DB_NAME" | gzip -c > "$BACKUP_ROOT/db-$STAMP.sql.gz"

if [[ -d "$UPLOAD_DIR" ]]; then
  tar -czf "$BACKUP_ROOT/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
fi

find "$BACKUP_ROOT" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete: $BACKUP_ROOT (*-$STAMP.*)"
echo "Copy artifacts off-box. Run a restore drill on staging before launch."
