#!/usr/bin/env bash
# Miracle Times Phase 2 privileged bootstrap (Contabo) — revised.
# - No Miracle Drugs edits / no public DNS / no TLS cutover
# - API :4001 and Next :3000 on 127.0.0.1 only
# - Resumable: does not regenerate secrets or overwrite env/DB unexpectedly
# - Does not edit /etc/nginx/nginx.conf (uses conf.d + sites-available)
#
# Run ONLY after operator review (interactive SSH + sudo on the Contabo host):
#   sudo bash /home/deploy/mt-phase2/phase2-bootstrap.sh
set -euo pipefail

STAGING="${STAGING:-/home/deploy/mt-phase2}"
APP_ROOT="/opt/miracletimes"
UPLOAD_DIR="/var/lib/miracletimes/uploads"
ENV_DIR="/etc/miracle-times"
BACKUP_DIR="/var/backups/miracletimes"
LOG_DIR="/var/log/miracle-times"
NGINX_BACKUP_DIR="$BACKUP_DIR/nginx"
REPO_SSH="git@github.com-miracletimes:umairkhan21-dev/miracletimes-.git"
BRANCH="main"
DB_NAME="miracle_times"
DB_USER="miracle_times"
MARK="$ENV_DIR/.phase2_bootstrap_complete"
DRUGS_SITE_ENABLED="/etc/nginx/sites-enabled/miracledrugsindia"
DRUGS_SITE_AVAILABLE="/etc/nginx/sites-available/miracledrugsindia"
# Optional: MT_NGINX_OVERWRITE=1 to replace differing MT nginx site files after backup.

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "run as root via sudo"
}

stamp() { date -u +%Y%m%dT%H%M%SZ; }

backup_file() {
  local src="$1"
  local dest_dir="$2"
  [[ -e "$src" ]] || return 0
  install -d -m 0750 "$dest_dir"
  local base dest
  base="$(basename "$src")"
  dest="$dest_dir/${base}.$(stamp).bak"
  cp -a "$src" "$dest"
  log "Backed up $src -> $dest"
}

port_listener_ok() {
  # $1=port $2=expected unit substring (optional)
  local port="$1"
  local unit_hint="${2:-}"
  if ! ss -lnt | grep -qE ":${port}\\b"; then
    return 0
  fi
  # Allow resume when our own unit already owns the port.
  if [[ -n "$unit_hint" ]] && systemctl is-active --quiet "$unit_hint" 2>/dev/null; then
    log "Port $port in use by active $unit_hint (resume OK)"
    return 0
  fi
  ss -lntp | grep -E ":${port}\\b" || true
  die "port $port already in use by an unexpected process"
}

assert_loopback_port() {
  local port="$1"
  local line
  line="$(ss -lnt | grep -E ":${port}\\b" || true)"
  [[ -n "$line" ]] || die "expected listener on port $port"
  if echo "$line" | grep -qE '0\.0\.0\.0:'"${port}"'|:::'"${port}"; then
    die "port $port is exposed on a non-loopback address: $line"
  fi
  if ! echo "$line" | grep -qE '127\.0\.0\.1:'"${port}"; then
    die "port $port is not bound to 127.0.0.1: $line"
  fi
}

drugs_health() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health || true
}

assert_drugs_untouched_paths() {
  [[ -e "$DRUGS_SITE_ENABLED" ]] || die "Miracle Drugs nginx enabled site missing"
  [[ -f "$DRUGS_SITE_AVAILABLE" ]] || die "Miracle Drugs nginx available site missing"
  # Refuse if Drugs site file changed during this run unexpectedly — checksum at start/end.
  :
}

install_site_file() {
  # $1=source $2=dest (sites-available path)
  local src="$1"
  local dest="$2"
  if [[ -e "$dest" ]]; then
    backup_file "$dest" "$NGINX_BACKUP_DIR"
    if cmp -s "$src" "$dest"; then
      log "Nginx site unchanged: $dest"
      return 0
    fi
    if [[ "${MT_NGINX_OVERWRITE:-0}" != "1" ]]; then
      log "Existing Nginx file differs: $dest"
      log "Inspect the backup under $NGINX_BACKUP_DIR and the staged source:"
      log "  $src"
      die "refusing to overwrite $dest (set MT_NGINX_OVERWRITE=1 after review)"
    fi
    log "MT_NGINX_OVERWRITE=1 set — replacing $dest after backup"
  fi
  install -m 0644 "$src" "$dest"
}

require_root
[[ -d "$STAGING" ]] || die "staging missing: $STAGING"

for req in \
  phase2-bootstrap.sh \
  phase2-rollback.sh \
  miracle_times_schema.sql \
  nginx-miracle-times-shared.conf \
  nginx-miracletimes.in.http-private.conf \
  nginx-api.miracletimes.in.http-private.conf \
  nginx-miracletimes.in.conf \
  nginx-api.miracletimes.in.conf \
  miracle-times-api.service \
  miracle-times-web.service \
  lib-api.ts \
  next.config.ts \
  create-admin.js
 do
  [[ -f "$STAGING/$req" ]] || die "missing staged file: $STAGING/$req"
done

DRUGS_SHA_BEFORE="$(sha256sum "$DRUGS_SITE_AVAILABLE" | awk '{print $1}')"

log "=== Preflight: Miracle Drugs health ==="
drugs="$(drugs_health)"
[[ "$drugs" == "200" ]] || die "Miracle Drugs health returned '$drugs' — aborting"
log "Drugs health OK ($drugs)"

log "=== Preflight: ports 3000 / 4001 ==="
port_listener_ok 3000 miracle-times-web.service
port_listener_ok 4001 miracle-times-api.service

log "=== MySQL database names (names only) ==="
mapfile -t DB_NAMES < <(mysql -N -e "SHOW DATABASES;")
printf '%s\n' "${DB_NAMES[@]}"
if printf '%s\n' "${DB_NAMES[@]}" | grep -qx "miracledrugsindia"; then
  log "Confirmed Drugs-related DB name present (will not touch)."
fi

log "=== Ensure system user miracletimes ==="
if ! id -u miracletimes >/dev/null 2>&1; then
  useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin miracletimes
  log "Created user miracletimes"
else
  log "User miracletimes already exists"
fi

log "=== Directories ==="
install -d -o miracletimes -g miracletimes -m 0755 "$UPLOAD_DIR" "$BACKUP_DIR" "$LOG_DIR"
install -d -o root -g miracletimes -m 0750 "$ENV_DIR"
install -d -o root -g root -m 0750 "$NGINX_BACKUP_DIR"
# IMPORTANT: never `install -d -o deploy "$APP_ROOT"` on an existing checkout.
# That only retargets the top directory ownership and leaves `.git` (and the rest
# of the tree) on another UID — the mixed-ownership / dubious-ownership failure.

assert_tree_owner() {
  local expect_user="$1"
  local expect_group="${2:-$1}"
  local dir_u dir_g git_u git_g
  [[ -d "$APP_ROOT" ]] || die "missing $APP_ROOT"
  dir_u="$(stat -c '%U' "$APP_ROOT")"
  dir_g="$(stat -c '%G' "$APP_ROOT")"
  [[ "$dir_u" == "$expect_user" && "$dir_g" == "$expect_group" ]] \
    || die "ownership mismatch on $APP_ROOT (got ${dir_u}:${dir_g}, want ${expect_user}:${expect_group})"
  if [[ -d "$APP_ROOT/.git" ]]; then
    git_u="$(stat -c '%U' "$APP_ROOT/.git")"
    git_g="$(stat -c '%G' "$APP_ROOT/.git")"
    [[ "$git_u" == "$expect_user" && "$git_g" == "$expect_group" ]] \
      || die "ownership mismatch on $APP_ROOT/.git (got ${git_u}:${git_g}, want ${expect_user}:${expect_group})"
  fi
  # Fail fast if any path under the tree drifted (mixed ownership).
  local bad
  bad="$(find "$APP_ROOT" \( ! -user "$expect_user" -o ! -group "$expect_group" \) -print -quit 2>/dev/null || true)"
  [[ -z "$bad" ]] || die "mixed ownership under $APP_ROOT (example: $bad); refuse to continue"
}

chown_tree() {
  local user="$1"
  local group="${2:-$1}"
  chown -R "${user}:${group}" "$APP_ROOT"
  assert_tree_owner "$user" "$group"
}

# Git must run as the directory owner. Running `git` as root against a
# miracletimes-owned tree triggers "dubious ownership". Do not set
# safe.directory=* globally.
git_ssh_as_deploy() {
  assert_tree_owner deploy deploy
  sudo -u deploy -H env \
    GIT_SSH_COMMAND="ssh -i /home/deploy/.ssh/miracletimes_github_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
    git -C "$APP_ROOT" "$@"
}

log "=== Clone or update repository ==="
# Never delete or reclone over /opt/miracletimes. Resume keeps the existing checkout.
if [[ ! -d "$APP_ROOT/.git" ]]; then
  if [[ ! -d "$APP_ROOT" ]]; then
    install -d -o deploy -g deploy -m 0755 "$APP_ROOT"
  elif [[ -n "$(ls -A "$APP_ROOT" 2>/dev/null || true)" ]]; then
    die "$APP_ROOT is non-empty without .git — inspect before continuing (will not delete/reclone)"
  else
    # Empty dir: ensure deploy can write the fresh clone (full tree, not top-only).
    chown deploy:deploy "$APP_ROOT"
  fi
  assert_tree_owner deploy deploy
  sudo -u deploy -H env \
    GIT_SSH_COMMAND="ssh -i /home/deploy/.ssh/miracletimes_github_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
    git clone --branch "$BRANCH" --depth 1 "$REPO_SSH" "$APP_ROOT"
  assert_tree_owner deploy deploy
  MAIN_SHA="$(sudo -u deploy -H git -C "$APP_ROOT" rev-parse HEAD)"
else
  # Existing checkout: normalize any prior mixed ownership, then update in place.
  log "Existing git checkout found — will not delete or reclone"
  chown_tree miracletimes miracletimes
  PREV_SHA="$(sudo -u miracletimes -H git -C "$APP_ROOT" rev-parse HEAD)"
  log "Existing checkout HEAD=$PREV_SHA (fetch/update only)"

  # deploy holds the GitHub deploy key; briefly make the *entire* tree deploy-owned
  # for fetch/checkout (dir + .git together), then restore miracletimes.
  chown_tree deploy deploy
  git_ssh_as_deploy fetch --depth 1 origin "$BRANCH"
  git_ssh_as_deploy checkout -B "$BRANCH" "origin/$BRANCH"
  MAIN_SHA="$(sudo -u deploy -H git -C "$APP_ROOT" rev-parse HEAD)"
  log "Updated $PREV_SHA -> $MAIN_SHA"
fi

chown_tree miracletimes miracletimes
MAIN_SHA="$(sudo -u miracletimes -H git -C "$APP_ROOT" rev-parse HEAD)"
log "Checked out $BRANCH @ $MAIN_SHA (owner miracletimes; dir+.git consistent)"

log "=== Overlay Contabo Phase-2 files (4001, shared nginx, API_INTERNAL_URL support) ==="
install -d -o miracletimes -g miracletimes -m 0755 "$APP_ROOT/deploy/contabo"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/miracle_times_schema.sql" "$APP_ROOT/deploy/contabo/miracle_times_schema.sql"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/nginx-miracle-times-shared.conf" "$APP_ROOT/deploy/contabo/nginx-miracle-times-shared.conf"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/nginx-api.miracletimes.in.conf" "$APP_ROOT/deploy/contabo/nginx-api.miracletimes.in.conf"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/nginx-miracletimes.in.conf" "$APP_ROOT/deploy/contabo/nginx-miracletimes.in.conf"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/nginx-api.miracletimes.in.http-private.conf" "$APP_ROOT/deploy/contabo/nginx-api.miracletimes.in.http-private.conf"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/nginx-miracletimes.in.http-private.conf" "$APP_ROOT/deploy/contabo/nginx-miracletimes.in.http-private.conf"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/miracle-times-api.service" "$APP_ROOT/deploy/contabo/miracle-times-api.service"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/miracle-times-web.service" "$APP_ROOT/deploy/contabo/miracle-times-web.service"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/phase2-bootstrap.sh" "$APP_ROOT/deploy/contabo/phase2-bootstrap.sh"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/phase2-rollback.sh" "$APP_ROOT/deploy/contabo/phase2-rollback.sh"
# App overlays required for private Contabo SSR without baking loopback into the browser bundle.
install -m 0644 -o miracletimes -g miracletimes "$STAGING/lib-api.ts" "$APP_ROOT/lib/api.ts"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/next.config.ts" "$APP_ROOT/next.config.ts"
install -m 0644 -o miracletimes -g miracletimes "$STAGING/create-admin.js" "$APP_ROOT/backend/scripts/create-admin.js"
assert_tree_owner miracletimes miracletimes

log "=== MySQL database + env (resumable; no secret regeneration if api.env exists) ==="
if [[ -f "$ENV_DIR/api.env" ]]; then
  log "Reusing existing $ENV_DIR/api.env (secrets not regenerated)"
else
  DB_PASS="$(openssl rand -base64 32 | tr -d '\n' | tr '/+' 'AB')"
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  REVALIDATE_TOKEN="$(openssl rand -hex 32)"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '\n' | tr '/+' 'xy')"

  DB_EXISTS=0
  if printf '%s\n' "${DB_NAMES[@]}" | grep -qx "$DB_NAME"; then
    DB_EXISTS=1
  fi

  if [[ "$DB_EXISTS" -eq 1 ]]; then
    TABLE_COUNT="$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
    log "Database $DB_NAME already exists with table_count=$TABLE_COUNT"
    if [[ "$TABLE_COUNT" -gt 0 ]]; then
      die "$DB_NAME already has tables but api.env is missing — manual recovery required (refusing to reset DB user/secrets)"
    fi
  else
    mysql -e "CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    log "Created database $DB_NAME"
  fi

  # Create DB user only when provisioning fresh env. Never ALTER an existing
  # user's password on resume (api.env already present handled above).
  if mysql -N -e "SELECT 1 FROM mysql.user WHERE user='${DB_USER}' AND host='localhost'" | grep -q 1; then
    die "MySQL user ${DB_USER}@localhost already exists without api.env — refusing to reset password"
  fi
  mysql -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
  mysql -e "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES, CREATE TEMPORARY TABLES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"

  umask 027
  cat > "$ENV_DIR/api.env" <<EOF
NODE_ENV=production
PORT=4001
LISTEN_HOST=127.0.0.1
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=12h
COOKIE_NAME=mt_token
FRONTEND_URL=https://miracletimes.in
CORS_ORIGINS=https://miracletimes.in,https://www.miracletimes.in
UPLOAD_DIR=${UPLOAD_DIR}
MAX_UPLOAD_BYTES=1048576
PUBLIC_BASE_URL=https://api.miracletimes.in
SCHEDULE_INTERVAL_MS=60000
CACHE_REVALIDATE_URL=http://127.0.0.1:3000/api/revalidate/
CACHE_REVALIDATE_TOKEN=${REVALIDATE_TOKEN}
CACHE_REVALIDATE_DEBOUNCE_MS=5000
STORAGE_PROVIDER=local
EOF
  cat > "$ENV_DIR/web.env" <<EOF
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://api.miracletimes.in
API_INTERNAL_URL=http://127.0.0.1:4001
REVALIDATE_TOKEN=${REVALIDATE_TOKEN}
EOF
  chown root:miracletimes "$ENV_DIR/api.env" "$ENV_DIR/web.env"
  chmod 0640 "$ENV_DIR/api.env" "$ENV_DIR/web.env"

  umask 077
  # Password-only file for seed:admin (never passed on argv).
  printf '%s\n' "$ADMIN_PASS" > "$ENV_DIR/admin-password"
  chown root:root "$ENV_DIR/admin-password"
  chmod 0600 "$ENV_DIR/admin-password"
  cat > "$ENV_DIR/admin-bootstrap.txt" <<EOF
email=desk@miracletimes.in
name=Desk Admin
password_file=${ENV_DIR}/admin-password
note=Phase 2 generated credentials. Rotate after first successful login. Browser cookie login needs Phase 3 HTTPS/DNS; private checks use loopback/Host-header.
EOF
  chown root:root "$ENV_DIR/admin-bootstrap.txt"
  chmod 0600 "$ENV_DIR/admin-bootstrap.txt"
  log "Wrote env + admin credential files (contents not printed)"
fi

# Schema import only when DB has zero tables.
TABLE_COUNT="$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null || echo 0)"
if [[ "$TABLE_COUNT" -eq 0 ]]; then
  log "=== Import schema (structure only) ==="
  mysql "$DB_NAME" < "$STAGING/miracle_times_schema.sql"
  TABLE_COUNT="$(mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
  [[ "$TABLE_COUNT" -eq 10 ]] || die "expected 10 tables, found $TABLE_COUNT"
  log "Schema tables: $TABLE_COUNT"
else
  log "Skipping schema import (table_count=$TABLE_COUNT)"
fi

log "=== Validate env variable names against expected keys ==="
for key in NODE_ENV PORT LISTEN_HOST DB_HOST DB_USER DB_PASSWORD DB_NAME JWT_SECRET \
  FRONTEND_URL CORS_ORIGINS UPLOAD_DIR MAX_UPLOAD_BYTES PUBLIC_BASE_URL \
  CACHE_REVALIDATE_URL CACHE_REVALIDATE_TOKEN STORAGE_PROVIDER; do
  grep -q "^${key}=" "$ENV_DIR/api.env" || die "api.env missing $key"
done
for key in NODE_ENV PORT NEXT_PUBLIC_API_URL API_INTERNAL_URL REVALIDATE_TOKEN; do
  grep -q "^${key}=" "$ENV_DIR/web.env" || die "web.env missing $key"
done
grep -q '^NEXT_PUBLIC_API_URL=https://api.miracletimes.in$' "$ENV_DIR/web.env" \
  || die "NEXT_PUBLIC_API_URL must be https://api.miracletimes.in (not loopback)"
grep -q '^API_INTERNAL_URL=http://127.0.0.1:4001$' "$ENV_DIR/web.env" \
  || die "API_INTERNAL_URL must be http://127.0.0.1:4001"
grep -q '^PORT=4001$' "$ENV_DIR/api.env" || die "api PORT must be 4001"
grep -q '^LISTEN_HOST=127.0.0.1$' "$ENV_DIR/api.env" || die "LISTEN_HOST must be 127.0.0.1"
grep -q '^MAX_UPLOAD_BYTES=1048576$' "$ENV_DIR/api.env" || die "MAX_UPLOAD_BYTES must remain 1 MiB"

log "=== npm ci (API + web) ==="
sudo -u miracletimes -H bash -lc "cd '$APP_ROOT/backend' && npm ci --omit=dev"
sudo -u miracletimes -H bash -lc "cd '$APP_ROOT' && npm ci"
chown -R miracletimes:miracletimes "$APP_ROOT"

log "=== systemd units (install before API start; web starts after build) ==="
backup_file /etc/systemd/system/miracle-times-api.service "$BACKUP_DIR/systemd"
backup_file /etc/systemd/system/miracle-times-web.service "$BACKUP_DIR/systemd"
install -m 0644 "$APP_ROOT/deploy/contabo/miracle-times-api.service" /etc/systemd/system/miracle-times-api.service
install -m 0644 "$APP_ROOT/deploy/contabo/miracle-times-web.service" /etc/systemd/system/miracle-times-web.service
# Refuse obsolete rebuild unit.
[[ ! -f /etc/systemd/system/miracle-times-rebuild.service ]] || log "NOTE: obsolete rebuild unit file present — not enabling it"
systemctl daemon-reload
systemctl enable miracle-times-api.service miracle-times-web.service

log "=== Seed categories (idempotent) ==="
sudo -u miracletimes -H bash -lc "cd '$APP_ROOT/backend' && set -a && . '$ENV_DIR/api.env' && set +a && npm run seed:categories"

log "=== Seed admin (password via file only; skip if user exists) ==="
if [[ -f "$ENV_DIR/admin-password" && -f "$ENV_DIR/admin-bootstrap.txt" ]]; then
  ADMIN_EMAIL="$(sed -n 's/^email=//p' "$ENV_DIR/admin-bootstrap.txt")"
  ADMIN_NAME="$(sed -n 's/^name=//p' "$ENV_DIR/admin-bootstrap.txt")"
  EXISTS="$(mysql -N -e "SELECT COUNT(*) FROM \`${DB_NAME}\`.users WHERE email='${ADMIN_EMAIL}';")"
  if [[ "$EXISTS" == "0" ]]; then
    # Run as root so ADMIN_PASSWORD_FILE can stay mode 0600 root:root (never on argv).
    (
      set -a
      # shellcheck disable=SC1091
      . "$ENV_DIR/api.env"
      set +a
      export ADMIN_NAME ADMIN_EMAIL
      export ADMIN_PASSWORD_FILE="$ENV_DIR/admin-password"
      cd "$APP_ROOT/backend"
      npm run seed:admin
    )
    log "Admin user created for $ADMIN_EMAIL"
  else
    log "Admin email already present — skipping seed:admin (password file left unchanged)"
  fi
else
  log "No admin-password file — skipping admin seed"
fi

log "=== Start API before Next build (SSR prerender needs API_INTERNAL_URL) ==="
systemctl restart miracle-times-api.service
sleep 2
systemctl is-active --quiet miracle-times-api.service || die "miracle-times-api failed to start"
api_boot="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:4001/api/health || true)"
[[ "$api_boot" == "200" ]] || die "API health failed before Next build ($api_boot)"
assert_loopback_port 4001

log "=== Next production build (uses public NEXT_PUBLIC_API_URL + API_INTERNAL_URL) ==="
sudo -u miracletimes -H bash -lc "set -a; . '$ENV_DIR/web.env'; set +a; cd '$APP_ROOT' && npm run build"
chown -R miracletimes:miracletimes "$APP_ROOT"

log "=== Start Miracle Times web ==="
systemctl restart miracle-times-web.service
sleep 3
systemctl is-active --quiet miracle-times-web.service || die "miracle-times-web failed to start"

log "=== Nginx private HTTP vhosts (isolated; no nginx.conf edits) ==="
# Conflict check: server_name already claimed by non-MT files?
if grep -RInE 'server_name[[:space:]].*(^|[[:space:]])(www\.)?miracletimes\.in([[:space:;]|]|$)' \
  /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
  | grep -vE '/miracletimes\.in:|/api\.miracletimes\.in:|miracle-times-shared' \
  | grep -q .; then
  die "conflicting miracletimes.in server_name found outside MT site files"
fi

# Shared zones/upstreams in conf.d — never edit /etc/nginx/nginx.conf.
if [[ -f /etc/nginx/conf.d/miracle-times-shared.conf ]]; then
  backup_file /etc/nginx/conf.d/miracle-times-shared.conf "$NGINX_BACKUP_DIR"
  if ! cmp -s "$APP_ROOT/deploy/contabo/nginx-miracle-times-shared.conf" \
    /etc/nginx/conf.d/miracle-times-shared.conf; then
    if [[ "${MT_NGINX_OVERWRITE:-0}" != "1" ]]; then
      die "existing conf.d/miracle-times-shared.conf differs (set MT_NGINX_OVERWRITE=1 after review)"
    fi
  fi
fi
install -m 0644 "$APP_ROOT/deploy/contabo/nginx-miracle-times-shared.conf" \
  /etc/nginx/conf.d/miracle-times-shared.conf

install_site_file "$APP_ROOT/deploy/contabo/nginx-miracletimes.in.http-private.conf" \
  /etc/nginx/sites-available/miracletimes.in
install_site_file "$APP_ROOT/deploy/contabo/nginx-api.miracletimes.in.http-private.conf" \
  /etc/nginx/sites-available/api.miracletimes.in

ln -sfn /etc/nginx/sites-available/miracletimes.in /etc/nginx/sites-enabled/miracletimes.in
ln -sfn /etc/nginx/sites-available/api.miracletimes.in /etc/nginx/sites-enabled/api.miracletimes.in

[[ -e "$DRUGS_SITE_ENABLED" ]] || die "Miracle Drugs nginx site missing from sites-enabled after MT changes"
DRUGS_SHA_AFTER="$(sha256sum "$DRUGS_SITE_AVAILABLE" | awk '{print $1}')"
[[ "$DRUGS_SHA_BEFORE" == "$DRUGS_SHA_AFTER" ]] || die "Miracle Drugs nginx file changed unexpectedly — aborting before reload"

nginx -t || die "nginx -t failed — not reloading"
systemctl reload nginx

log "=== Mandatory health checks ==="
api_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:4001/api/health || true)"
web_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3000/ || true)"
drugs_code="$(drugs_health)"
host_site="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -H 'Host: miracletimes.in' http://127.0.0.1/ || true)"
host_api="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: api.miracletimes.in' http://127.0.0.1/api/health || true)"

log "api_health=$api_code web_home=$web_code drugs_health=$drugs_code host_site=$host_site host_api=$host_api"

[[ "$api_code" == "200" ]] || die "Miracle Times API health failed ($api_code)"
[[ "$web_code" == "200" ]] || die "Miracle Times web home failed ($web_code)"
[[ "$drugs_code" == "200" ]] || die "Miracle Drugs health failed after bootstrap ($drugs_code)"

assert_loopback_port 4001
assert_loopback_port 3000
# Drugs still loopback
assert_loopback_port 4000

ss -lntp | egrep ':(3000|4000|4001)\b' || true

date -u +"Phase2 bootstrap finished at %Y-%m-%dT%H:%M:%SZ sha=$MAIN_SHA" > "$MARK"
chmod 0644 "$MARK"
log "BOOTSTRAP_OK"
log "Admin credential files (root-only): $ENV_DIR/admin-bootstrap.txt and $ENV_DIR/admin-password"
log "Read metadata: sudo cat $ENV_DIR/admin-bootstrap.txt"
log "Rollback (no data delete): sudo bash $STAGING/phase2-rollback.sh"
log "Private browser testing before DNS: add temporary local hosts entries pointing miracletimes.in and api.miracletimes.in to 5.183.35.64 (HTTPS still needs Phase 3 certs)."
