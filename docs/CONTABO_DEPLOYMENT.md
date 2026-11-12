# Contabo deployment plan — Miracle Times only (SSR / ISR)

This plan targets the Contabo VPS (`Ubuntu 24.04`, `Nginx`, `Node.js 20+` / `24`)
for **Miracle Times**. It must not modify Miracle Drugs vhosts, databases, or
document roots.

**Do not apply these steps until you explicitly approve a production change
window.** Templates live under `deploy/contabo/` in this repo.

## Target topology

| Role | Host / path |
|---|---|
| Public site (Next.js SSR/ISR) | `https://miracletimes.in` → Nginx → `127.0.0.1:3000` |
| API + uploads (local media fallback) | `https://api.miracletimes.in` → Nginx → `127.0.0.1:4001` |
| MySQL | Localhost only (not public) |
| Object storage (optional) | S3-compatible (R2 / Contabo Object Storage) via env |
| Miracle Drugs | **Unchanged** separate Nginx server blocks / paths (API on `127.0.0.1:4000`) |

```
Internet
   │
   ├─ miracletimes.in ──Nginx──► 127.0.0.1:3000 (next start)
   └─ api.miracletimes.in ──Nginx──► 127.0.0.1:4001 (Express API)
```

**Port note:** Miracle Drugs already binds `127.0.0.1:4000`. Miracle Times API
must use `PORT=4001` / `PUBLIC_BASE_URL` accordingly.

Static `out/` + `/hooks/rebuild` are **retired**. Publishing no longer runs
`npm run build:export`.

## Verified publishing + cache revalidation

Admin SEO / content changes appear after MySQL commit + on-demand Next.js
revalidation (debounced). No full site rebuild.

### What triggers revalidation (API)

The API queues `CACHE_REVALIDATE_URL` (debounced, default **5s**) when:

| Action | Revalidate? |
|---|---|
| Publish draft → published | Yes |
| Update a **published** article (including SEO title/description only) | Yes |
| Archive / delete a previously published article | Yes |
| Create as draft / update draft only | No |
| Schedule for later | No (runs when the scheduler publishes) |

### Revalidation endpoint

- Next Route Handler: `POST /api/revalidate`
- Auth: header `X-Revalidate-Token` (timing-safe); **not** query-string tokens
- Body: `{ reason, tags[], paths[] }`
- Production API should call **loopback**:
  `CACHE_REVALIDATE_URL=http://127.0.0.1:3000/api/revalidate`
- Shared secret: `CACHE_REVALIDATE_TOKEN` (API) and `REVALIDATE_TOKEN` (Next `web.env`)

### End-to-end editor workflow

1. Editor sets Hindi/English **SEO title / SEO description** (optional) and content → Save / Publish.
2. API writes translations + body to MySQL.
3. If public-facing, API debounces → `POST` revalidate with article/category/home/sitemap tags.
4. Next serves fresh HTML on the next request. Each `/news/{slug}/` response includes:
   - `<title>`, meta description, canonical, Open Graph, Twitter, NewsArticle JSON-LD
   - **Full article body**, headline, author, and dates in the initial HTML
5. Language toggle still works client-side by navigating/fetching the sibling translation.

### Local verification (no Contabo)

```bash
# Backend on :4001
cd backend && npm start

# From repo root — production-like SSR
REVALIDATE_TOKEN=local-dev-revalidate-token-32chars-min npm run build
REVALIDATE_TOKEN=local-dev-revalidate-token-32chars-min npm run start

# Smoke (expects API + Next running)
REVALIDATE_TOKEN=local-dev-revalidate-token-32chars-min npm run test:ssr-smoke
```

## One-time server prep (operator)

1. Create system user `miracletimes` and directories:
   - `/opt/miracletimes` (app checkout)
   - `/var/lib/miracletimes/uploads` (legacy/local media; keep existing files)
   - `/etc/miracle-times/` (env files, mode `0640`, owner `root:miracletimes`)
   - `/var/backups/miracletimes`
2. Install Node **20 LTS or 24**, MySQL, Nginx, Certbot.
3. Create MySQL database/user for Miracle Times only (not shared with other apps).
4. Clone this repo to `/opt/miracletimes` and `npm ci` in root + `backend/`.
5. Copy env templates:
   - `/etc/miracle-times/api.env` from `backend/.env.example` (production values)
   - `/etc/miracle-times/web.env` (Next.js — see below)
6. Set production API env highlights:
   - `NODE_ENV=production`
   - `LISTEN_HOST=127.0.0.1`
   - `FRONTEND_URL=https://miracletimes.in`
   - `CORS_ORIGINS=https://miracletimes.in,https://www.miracletimes.in`
   - `PUBLIC_BASE_URL=https://api.miracletimes.in`
   - `UPLOAD_DIR=/var/lib/miracletimes/uploads`
   - `CACHE_REVALIDATE_URL=http://127.0.0.1:3000/api/revalidate/`
   - `CACHE_REVALIDATE_TOKEN=<same as web REVALIDATE_TOKEN>`
   - `STORAGE_PROVIDER=local` until S3/R2 credentials are ready
   - Strong `JWT_SECRET` / `DB_PASSWORD` (never commit)
7. Install systemd units:
   - `deploy/contabo/miracle-times-api.service`
   - `deploy/contabo/miracle-times-web.service`
   - Do **not** install `miracle-times-rebuild.service` (obsolete)
8. Install Nginx site files from `deploy/contabo/nginx-*.conf` **as new site files** —
   do not overwrite Miracle Drugs configs. Install `nginx-miracle-times-shared.conf` under
   `/etc/nginx/conf.d/` (zones + upstreams); do not edit `/etc/nginx/nginx.conf`.
9. Issue TLS certs for `miracletimes.in` and `api.miracletimes.in`.
10. Seed admin: `cd /opt/miracletimes/backend && npm run seed:admin -- …`
11. Enable firewall: `80/443` public; SSH restricted; **deny** Node ports `3000`/`4001` (and Drugs `4000`) and MySQL `3306` publicly.
12. Schedule `deploy/contabo/backup.sh` via cron; copy backups off-box; restore-drill on staging.
13. Optional later: set `STORAGE_PROVIDER=s3` + R2/Contabo Object Storage env — **do not migrate/delete existing local media**.

### `web.env` example (names only)

```bash
NODE_ENV=production
PORT=3000
# Browser-facing API origin (baked into client). Never use 127.0.0.1 here.
NEXT_PUBLIC_API_URL=https://api.miracletimes.in
# Server-only SSR/fetch origin on the same VPS (not exposed to browsers).
API_INTERNAL_URL=http://127.0.0.1:4001
REVALIDATE_TOKEN=generate-with-openssl-rand-hex-32
# Optional CDN/image hosts for next/image remotePatterns:
# NEXT_IMAGE_REMOTE_HOSTS=cdn.miracletimes.in,pub-xxxx.r2.dev
```

## Resource / performance notes

| Concern | Guidance |
|---|---|
| CPU / RAM | Steady Next + API (~2–3 GB planning estimate); ISR + short revalidate windows reduce origin work |
| Disk | App + MySQL + logs; media should move off-box when S3 is enabled |
| Overlap | Debounced revalidation coalesces burst edits |
| Security | Loopback revalidate + shared secret header; Nginx allowlist for `/api/revalidate` |
| Miracle Drugs | Separate Nginx roots/units; MemoryMax/CPUQuota on MT units |

## Verification checklist (after you approve go-live)

```bash
curl -sI https://miracletimes.in/ | grep -iE 'content-security-policy|strict-transport|x-frame'
curl -sI https://api.miracletimes.in/api/health
curl -s https://miracletimes.in/robots.txt | grep -E 'Disallow|Sitemap'
ss -lntp | grep -E '3000|4001|4000'   # Times 3000/4001 + Drugs 4000; all 127.0.0.1 only
```

After publishing a test article with a unique SEO title, confirm that string appears in
`curl -s https://miracletimes.in/news/<slug>/ | head` **without** running a rebuild.

Confirm Miracle Drugs vhosts still respond unchanged.

## Security tradeoffs documented

| Topic | Choice |
|---|---|
| JWT revocation | In-process denylist (single API process). Not shared across multiple Node replicas. |
| CSP | `script-src` still allows `'unsafe-inline'` for JSON-LD; language boot is external `/lang-boot.js`. |
| Revalidate token | Header-only shared secret (not query string). Prefer loopback URL from API. |
| Headers | Next `headers()` + Nginx HSTS/frame options. |
| Article HTML | Body is server-rendered for the slug’s language; other language still client-fetched on toggle. |
| Media | `STORAGE_PROVIDER=local` until S3 configured; existing uploads preserved. |

## Obsolete (do not re-enable on Contabo)

| Path | Status |
|---|---|
| `deploy/contabo/rebuild-webhook.mjs` | Obsolete — kept for rollback reference |
| `deploy/contabo/miracle-times-rebuild.service` | Obsolete |
| Nginx `root …/out` + `/hooks/rebuild` | Replaced by Next upstream |
| `npm run build:export` / `STATIC_EXPORT=1` | Retired for production |
| `docs/STATIC_DEPLOYMENT.md` | Historical |
