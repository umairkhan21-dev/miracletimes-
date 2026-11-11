# Contabo deployment plan — Miracle Times only

This plan targets the Contabo VPS (`Ubuntu 24.04`, `Nginx`, `Node.js 20+` / `24`)
for **Miracle Times**. It must not modify Miracle Drugs vhosts, databases, or
document roots.

**Do not apply these steps until you explicitly approve a production change
window.** Templates live under `deploy/contabo/` in this repo.

## Target topology

| Role | Host / path |
|---|---|
| Public site (static `out/`) | `https://miracletimes.in` → Nginx → `/var/www/miracletimes/out` |
| API + uploads | `https://api.miracletimes.in` → Nginx → `127.0.0.1:4000` |
| Rebuild webhook | Nginx `/hooks/rebuild` → `127.0.0.1:4010` (`rebuild-webhook.mjs`) |
| MySQL | Localhost only (not public) |
| Miracle Drugs | **Unchanged** separate Nginx server blocks / paths |

```
Internet
   │
   ├─ miracletimes.in ──Nginx── /var/www/miracletimes/out
   │                         └─ /hooks/rebuild ──► 127.0.0.1:4010
   └─ api.miracletimes.in ──Nginx──► 127.0.0.1:4000 (Node API)
```

## Verified publishing + rebuild process

Admin SEO / content changes do **not** appear on the public site until a
successful static export lands in Nginx’s document root.

### What triggers a rebuild (API)

The API queues `FRONTEND_DEPLOY_HOOK_URL` (debounced, default **45s**) when:

| Action | Rebuild? |
|---|---|
| Publish draft → published | Yes |
| Update a **published** article (including SEO title/description only) | Yes |
| Archive / delete a previously published article | Yes |
| Create as draft / update draft only | No |
| Schedule for later | No (rebuild runs when the scheduler publishes) |

### Contabo webhook behavior (`deploy/contabo/rebuild-webhook.mjs`)

1. Listens on **127.0.0.1 only** (never public).
2. Requires `REBUILD_HOOK_TOKEN` via `?token=` or `X-Rebuild-Token` (timing-safe compare).
3. Debounces bursts (`REBUILD_DEBOUNCE_MS`, default 5s) in addition to the API debounce.
4. While a build is running, further hooks set **re-run-after-current** so updates are not dropped.
5. Runs `npm ci` (optional skip via `REBUILD_SKIP_NPM_CI=1`), then `npm run build:export` with production `NEXT_PUBLIC_API_URL`.
6. Publishes via staging `rsync` into `SITE_OUT_DIR` (`--delete` on final sync).
7. Failures append to `deploy/contabo/logs/rebuild-failures.log` (and stdout for journald).
8. `GET /health` reports `busy`, `lastSuccessAt`, `lastError`.

### End-to-end editor workflow

1. Editor sets Hindi/English **SEO title / SEO description** (optional) and content → Save / Publish.
2. API writes `article_translations.seo_title` / `seo_description` and article body.
3. If the article is public-facing, API debounces → `POST` rebuild hook.
4. Webhook exports static HTML. Each `/news/{slug}/` page includes:
   - `<title>`, meta description, canonical, Open Graph, Twitter, NewsArticle JSON-LD from admin SEO (with headline/summary fallbacks)
   - **Full article body**, headline, author, and dates in the initial HTML (not JS-only)
5. Nginx serves the new `out/` tree. Google reads tags + body without waiting for client JS.
6. Language toggle still works client-side by navigating/fetching the sibling translation.

### Local verification (no Contabo)

With the API running locally:

```bash
# Backend on :4001
cd backend && npm start

# From repo root — export + SEO regression suite
npm run test:rebuild-smoke
```

This updates local `out/` only. It does not rsync to Contabo.

## One-time server prep (operator)

1. Create system user `miracletimes` and directories:
   - `/opt/miracletimes` (app checkout)
   - `/var/www/miracletimes/out` (web root)
   - `/var/lib/miracletimes/uploads`
   - `/etc/miracle-times/` (env files, mode `0640`, owner `root:miracletimes`)
   - `/var/backups/miracletimes`
2. Install Node **20 LTS or 24**, MySQL, Nginx, Certbot, `rsync`.
3. Create MySQL database/user for Miracle Times only (not shared with other apps).
4. Clone this repo to `/opt/miracletimes` and `npm ci` in root + `backend/`.
5. Copy env templates:
   - `/etc/miracle-times/api.env` from `backend/.env.example` (production values)
   - `/etc/miracle-times/rebuild.env` (see below)
6. Set production API env highlights:
   - `NODE_ENV=production`
   - `LISTEN_HOST=127.0.0.1` (defaulted by code if unset)
   - `FRONTEND_URL=https://miracletimes.in`
   - `CORS_ORIGINS=https://miracletimes.in,https://www.miracletimes.in`
   - `PUBLIC_BASE_URL=https://api.miracletimes.in`
   - `UPLOAD_DIR=/var/lib/miracletimes/uploads`
   - `FRONTEND_DEPLOY_HOOK_URL=https://miracletimes.in/hooks/rebuild?token=<REBUILD_HOOK_TOKEN>`
   - Strong `JWT_SECRET` / `DB_PASSWORD` (never commit)
7. Install systemd units from `deploy/contabo/*.service`.
8. Install Nginx site files from `deploy/contabo/nginx-*.conf` **as new site files** —
   do not overwrite Miracle Drugs configs. Declare `limit_req_zone` once in `http {}`.
9. Issue TLS certs for `miracletimes.in` and `api.miracletimes.in`.
10. Seed admin: `cd /opt/miracletimes/backend && npm run seed:admin -- …`
11. Enable firewall: `80/443` public; SSH restricted; **deny** Node ports `4000`/`4010` and MySQL `3306` publicly.
12. Schedule `deploy/contabo/backup.sh` via cron; copy backups off-box; restore-drill on staging.

### `rebuild.env` example (names only)

```bash
REBUILD_HOOK_TOKEN=generate-with-openssl-rand-hex-32
REBUILD_LISTEN_PORT=4010
REPO_DIR=/opt/miracletimes
SITE_OUT_DIR=/var/www/miracletimes/out
NEXT_PUBLIC_API_URL=https://api.miracletimes.in
REBUILD_DEBOUNCE_MS=5000
# REBUILD_SKIP_NPM_CI=1
# REBUILD_LOG_DIR=/var/log/miracle-times
```

## Resource / performance notes

| Concern | Guidance |
|---|---|
| CPU / RAM | Full `npm ci` + Next export is heavy; debounce + single-flight builds avoid pile-ups |
| Disk | Staging + live `out/` briefly coexist during rsync |
| Overlap | Webhook never runs two exports in parallel; queued re-run covers mid-build edits |
| Security | Token + loopback bind + Nginx TLS; failure logs must not contain the raw token |
| Miracle Drugs | Separate Nginx roots; rebuild paths are Miracle Times only |

## Verification checklist (after you approve go-live)

```bash
curl -sI https://miracletimes.in/ | grep -iE 'content-security-policy|strict-transport|x-frame'
curl -sI https://api.miracletimes.in/api/health
curl -s https://miracletimes.in/robots.txt | grep -E 'Disallow|Sitemap'
curl -s https://127.0.0.1:4010/health   # on the VPS only
ss -lntp | grep -E '4000|4010'   # should show 127.0.0.1 only
```

After publishing a test article with a unique SEO title, confirm that string appears in
`curl -s https://miracletimes.in/news/<slug>/ | head` once the rebuild finishes.

Confirm Miracle Drugs vhosts still respond unchanged.

## Security tradeoffs documented

| Topic | Choice |
|---|---|
| JWT revocation | In-process denylist (single API process). Not shared across multiple Node replicas. |
| CSP | `script-src` still allows `'unsafe-inline'` for JSON-LD; language boot is external `/lang-boot.js`. |
| Rebuild token | In HTTPS URL query. Protect with TLS + long random token; rotate if leaked. |
| Headers | Enforced by Nginx templates, not Next `headers()`. |
| Article HTML | Body is server-rendered into static export for the slug’s language; other language still client-fetched on toggle. |
