# Deployment security & production readiness

Code hardening alone does not make the site production-ready. Confirm these
controls on the live host after deploy. **Do not claim production readiness
without evidence from a real deployment.**

Recommended architecture (same registrable domain, separate hosts):

| Role | Origin |
|---|---|
| Public website + admin UI (Vercel) | `https://miracletimes.in` (and optionally `https://www.miracletimes.in`) |
| Express API + uploads (VPS) | `https://api.miracletimes.in` |

This keeps browser cookie auth **same-site** (shared eTLD+1 `miracletimes.in`)
while allowing TLS termination and process isolation on the API host.

---

## Required production environment variables (API)

Set these on the API host. Never commit real values. Names only:

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Unique random secret, **≥ 32 characters**, not an example/placeholder |
| `JWT_EXPIRES_IN` | e.g. `1d` (cookie `maxAge` matches this lifetime) |
| `COOKIE_NAME` | e.g. `mt_token` |
| `COOKIE_DOMAIN` | Optional. Only if you intentionally share the cookie across subdomains (e.g. `.miracletimes.in`). Host-only cookies on `api.miracletimes.in` are usually enough |
| `FRONTEND_URL` | Exact HTTPS frontend origin (e.g. `https://miracletimes.in`) |
| `CORS_ORIGINS` | Comma-separated **exact** HTTPS origins (no `*`) |
| `PUBLIC_BASE_URL` | HTTPS public API base used for uploaded media URLs |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | Strong unique DB password (**required** non-empty in production) |
| `DB_NAME` | Database name |
| `PORT` | API listen port behind TLS terminator (not public 80/443) |
| `LISTEN_HOST` | Optional. Set `127.0.0.1` behind a reverse proxy. Leave unset (or `0.0.0.0`) when the platform must bind all interfaces |
| `UPLOAD_DIR` | Persistent upload path on the VPS |
| `MAX_UPLOAD_BYTES` | Upload size cap |
| `SCHEDULE_INTERVAL_MS` | Scheduled publish poll interval |
| `FRONTEND_DEPLOY_HOOK_URL` | **Required** Vercel Deploy Hook HTTPS URL (server-side only). Production startup fails if missing |
| `FRONTEND_DEPLOY_DEBOUNCE_MS` | Optional debounce (default `45000`) |

Frontend (Vercel project env):

| Variable | Requirement |
|---|---|
| `NEXT_PUBLIC_API_URL` | HTTPS API origin used by the static site (no secrets), e.g. `https://api.miracletimes.in` |

### Generating secrets (do this on a trusted machine)

```bash
# JWT secret (≥32 bytes, URL-safe)
openssl rand -base64 48

# Database password
openssl rand -base64 32
```

Store values in the process manager / OS env / secret store on the API host.
Never put them in git, chat logs, or `NEXT_PUBLIC_*` variables.

Production startup **rejects** weak/example `JWT_SECRET` values, empty
`DB_PASSWORD`, missing `CORS_ORIGINS`, wildcard CORS, non-HTTPS public URLs,
and a missing/non-HTTPS `FRONTEND_DEPLOY_HOOK_URL` (static publishes would
otherwise never rebuild). Local development may still use an empty deploy
hook, empty `DB_PASSWORD`, and the example secret from `backend/.env.example`.

---

## Cookie, domain, CORS, and CSRF

### Why same-site custom domains matter

- `https://miracletimes.in` → `https://api.miracletimes.in` is **same-site**
  (shared registrable domain) but **cross-origin**.
- Credentialed `fetch(..., { credentials: "include" })` from the admin UI
  therefore sends the API host cookie when `SameSite=Strict` or `Lax`.
- Host-only cookies set by `api.miracletimes.in` are sufficient for API calls
  to that host. `COOKIE_DOMAIN=.miracletimes.in` is optional, not required.
- **Do not** put the production admin UI on `*.vercel.app` while the API lives
  on `api.miracletimes.in`. That is **cross-site**. `SameSite=Strict` cookies
  will not be sent on cross-site XHR/fetch, and third-party cookie restrictions
  will break login. Prefer the custom domain (or a same-site reverse proxy).
- Never set `SameSite=None` only to paper over unrelated registrable domains
  unless there is a documented, reviewed exception.

### Cookie settings (production)

| Attribute | Value |
|---|---|
| `HttpOnly` | `true` |
| `Secure` | `true` when `NODE_ENV=production` |
| `SameSite` | `Strict` in production (`Lax` in development) |
| `Path` | `/` |
| `Domain` | unset (host-only) **or** `.miracletimes.in` if explicitly required |
| Expiry | cookie `maxAge` equals `JWT_EXPIRES_IN` (same parsed duration) |

Login returns `{ user }` only — **no JWT in JSON**. Browsers must not store
bearer tokens in `localStorage` / JS-readable cookies. Non-browser clients may
still use `Authorization: Bearer` (CSRF Origin checks are skipped for Bearer).

### CORS

- Exact origins only, e.g.
  `https://miracletimes.in,https://www.miracletimes.in`
- Never combine `credentials: true` with `Access-Control-Allow-Origin: *`
- API startup fails in production if `CORS_ORIGINS` is missing, uses wildcards,
  or is not HTTPS

### CSRF

- Mutating `/api` requests that rely on the session cookie must present an
  allowed `Origin` (or matching `Referer`)
- Bearer-authenticated clients are exempt from the Origin check

---

## Frontend security headers (static export)

Production builds use Next.js `output: "export"`. Headers in `next.config.ts`
are **not** guaranteed for static files. Apply headers at the edge:

- **Vercel:** `vercel.json` in this repo (verify response headers after deploy)
- **Cloudflare / CDN:** mirror the same CSP, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`
- **nginx / Caddy:** add matching header directives if you ever serve `out/` yourself

CSP (see `vercel.json`):

- `connect-src` allows `'self'` and `https://api.miracletimes.in` only
- `img-src` allows `'self'`, `data:`, `blob:`, and `https://api.miracletimes.in`
  (uploaded media). Local `/images/*` assets are covered by `'self'`
- `'unsafe-inline'` remains for the language boot script and JSON-LD
- No `unsafe-eval`
- If the API origin changes, update `vercel.json` before redeploying the frontend

**Do not claim headers are active until you inspect live HTTP responses**, e.g.:

```bash
curl -sI https://miracletimes.in/ | grep -iE 'content-security-policy|strict-transport|x-frame'
curl -sI https://api.miracletimes.in/api/health
```

---

## Automatic static deployment

See [STATIC_DEPLOYMENT.md](./STATIC_DEPLOYMENT.md). Summary:

1. Public article publish/update/archive/delete (and scheduled publish) queues a
   debounced POST to `FRONTEND_DEPLOY_HOOK_URL`
2. Draft-only edits do **not** rebuild
3. Authors cannot edit published/scheduled articles, so they cannot trigger
   rebuilds via unauthorized content changes
4. Hook URLs are redacted in logs; failures are logged as errors (not success)
5. Deploy hooks are configured on the **API host only** — never in
   `NEXT_PUBLIC_*` or the browser

Create the hook: **Vercel → Project → Settings → Git → Deploy Hooks**
(production branch). Set `FRONTEND_DEPLOY_HOOK_URL` on the API host.

---

## VPS runbook (API host)

Distribution-specific steps are marked. Adjust package names for non-Debian
systems. Do **not** expose Node directly on public ports 80/443.

### 1. Node.js process management

Use one of:

- **systemd** unit running `node src/server.js` (or `npm start`) as a non-root
  user, with `EnvironmentFile=/etc/miracle-times/api.env`
- **pm2** (`pm2 start src/server.js --name miracle-api`) with startup restore
  enabled (`pm2 startup` / `pm2 save`) — pm2 commands depend on how Node was
  installed

Restart recovery: ensure the unit/`pm2 startup` is enabled so the API returns
after reboot.

### 2. Reverse proxy + TLS

Keep Node listening on `127.0.0.1:$PORT` (set `LISTEN_HOST=127.0.0.1`) or another
private interface. Leave `LISTEN_HOST` unset only when a host/PaaS requires the
default all-interfaces bind. Terminate TLS on the proxy:

**Caddy** (auto-HTTPS) example site block concept:

- `api.miracletimes.in` → `reverse_proxy 127.0.0.1:4000`
- Obtain certificates via ACME (Caddy default) or your provider’s DNS challenge

**Nginx** (Ubuntu/Debian often uses Certbot):

- `proxy_pass http://127.0.0.1:4000`
- TLS via Let’s Encrypt (`certbot` on Debian/Ubuntu) or the VPS panel’s
  certificate tooling
- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`

Both services (Vercel custom domain and API hostname) need **valid TLS**
certificates trusted by browsers.

### 3. Firewall and SSH

- Allow `22` (or your SSH port) only from trusted IPs when possible
- Allow `80`/`443` for the reverse proxy
- Deny public access to MySQL (`3306`) and the Node `PORT`
- Prefer key-based SSH; disable password auth when the provider supports it

Exact `ufw`/`firewall-cmd` syntax depends on the distro/panel.

### 4. Environment on the server

- Store env in a root-readable file outside the git tree (e.g.
  `/etc/miracle-times/api.env`) referenced by systemd/pm2
- Never commit `.env`, dumps, or hook URLs

### 5. Persistent uploads

- Point `UPLOAD_DIR` at a durable disk path (not ephemeral container storage)
- Back up that directory with the database (see below)
- `PUBLIC_BASE_URL` must be the HTTPS API origin so `<img>` URLs resolve under
  the CSP `img-src` allowlist

### 6. Database and media backups (required setup — not automated in code)

This repository does **not** ship a verified scheduled backup job. Before go-live
you must configure and test backups yourself.

**Suggested routine (operator-owned):**

```bash
# Example logical dump (run on API/DB host; adjust user/db names)
mysqldump -u "$DB_USER" -p "$DB_NAME" | gzip > "/backups/db-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

# Uploads tree
tar -czf "/backups/uploads-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" -C /path/to UPLOAD_DIR_BASENAME
```

Schedule with **cron** or the VPS panel’s scheduler. Copy artifacts off-box
(object storage / another region). Retention and encryption are operator choices.

**Restore drill (do once before launch on a staging host):**

1. Restore `*.sql.gz` into a clean database
2. Extract uploads into `UPLOAD_DIR`
3. Boot the API against the restored data
4. Confirm login, one published article, and one image URL

Until a scheduled job is configured **and** a restore test succeeds, treat
backups as **not verified**.

### 7. Logs, monitoring, restart

- Capture API stdout/stderr via journald or pm2 logs
- Rotate logs (`logrotate` on many Linux distros, or pm2 log rotate)
- Monitor: process up, `/api/health`, TLS expiry, disk for `UPLOAD_DIR`, failed
  deploy-hook error lines
- After reboot: confirm proxy, Node, and MySQL are up; hit health + admin login

---

## Admin account

There is **no public signup**. Bootstrap or rotate on the API host only:

```bash
cd backend
npm run seed:admin -- --name "Desk Admin" --email desk@example.com --password '…'
# Password reset / promote existing user to admin:
npm run seed:admin -- --email desk@example.com --password '…' --reset-password
```

Requirements enforced by the script: password length ≥ 12; rejects obvious
placeholder passwords. The password is never printed.

---

## Git hygiene

Ignored (see root / backend `.gitignore`): `.env`, `.env.*` (except examples),
`uploads/`, backup dumps, logs, `out/`, `.next/`.

Before release, commit intentional application changes only. Do not commit
secrets, hook URLs, database dumps, or upload binaries.

---

## Verification commands (post-deploy)

```bash
# TLS + security headers on the public site (must be inspected live)
curl -sI https://miracletimes.in/ | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type'

# API health over TLS
curl -sI https://api.miracletimes.in/api/health

# CORS preflight should not reflect arbitrary origins
curl -sI -X OPTIONS https://api.miracletimes.in/api/auth/login \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: POST'

# Login must Set-Cookie HttpOnly and omit token from JSON
curl -sD - -o /tmp/mt-login.json -X POST https://api.miracletimes.in/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://miracletimes.in' \
  --data '{"email":"…","password":"…"}'
# Inspect Set-Cookie; confirm /tmp/mt-login.json has data.user and no data.token
```

---

## Post-deploy smoke tests

1. Homepage and one Hindi + one English article render
2. Article image loads from `https://api.miracletimes.in/uploads/...`
3. Admin login on `https://miracletimes.in/admin` succeeds (cookie session)
4. Author can edit own draft; author receives 403 updating own published article
5. Editor publishes a draft → within debounce window, Vercel deploy starts
6. After deploy, new slug is live; archived/deleted slug is gone on next success
7. CSP/HSTS headers present on the apex domain response
8. Backup restore drill documented as completed

---

## Static frontend build commands

- Local preview: `npm run dev`
- Server build (no `out/` export): `npm run build`
- Production static export: `npm run build:export`
- Automated publish → deploy: [STATIC_DEPLOYMENT.md](./STATIC_DEPLOYMENT.md)
