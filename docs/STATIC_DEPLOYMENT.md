# Static frontend deployment

Miracle Times serves the public site as a Next.js **static export** (`out/`).
Article HTML, metadata, sitemap, and RSS are generated at **build time** from
the live API. Database writes alone do not change public pages.

**Primary production target:** Contabo VPS + Nginx. See
[CONTABO_DEPLOYMENT.md](./CONTABO_DEPLOYMENT.md) and templates in
`deploy/contabo/`.

`vercel.json` remains as an optional alternate host config; Contabo Nginx
templates are authoritative for the planned launch.

## Publish → live site workflow (Contabo)

1. An authenticated admin publishes, updates, archives, or deletes a
   **public-facing** article (or the scheduled publisher promotes due articles).
2. The API queues a **debounced** rebuild (`FRONTEND_DEPLOY_DEBOUNCE_MS`,
   default 45s) so rapid edits collapse into one rebuild.
3. The API `POST`s to `FRONTEND_DEPLOY_HOOK_URL` (Contabo rebuild webhook HTTPS
   URL with secret token). The hook URL is a secret; it is never exposed to the
   browser via `NEXT_PUBLIC_*`.
4. `deploy/contabo/rebuild-webhook.mjs` verifies the token, runs
   `npm run build:export`, and `rsync`s `out/` to the Nginx document root.
5. The build fetches published articles from `NEXT_PUBLIC_API_URL` (must be the
   production HTTPS API). Failed builds do **not** replace the live `out/`.
6. After a successful sync, new/updated HTML is live. Unpublished or deleted
   articles are omitted from `generateStaticParams`, sitemap, and RSS on the
   next successful build.

Draft-only edits do **not** trigger a rebuild.

## Required configuration (names only)

### API host environment

| Variable | Purpose |
|---|---|
| `FRONTEND_DEPLOY_HOOK_URL` | HTTPS rebuild webhook URL (**required** when `NODE_ENV=production`; API refuses to start without it) |
| `FRONTEND_DEPLOY_DEBOUNCE_MS` | Optional debounce (default `45000`) |

### Contabo rebuild webhook (`/etc/miracle-times/rebuild.env`)

| Variable | Purpose |
|---|---|
| `REBUILD_HOOK_TOKEN` | Long random shared secret |
| `NEXT_PUBLIC_API_URL` | Production HTTPS API origin for export builds |
| `SITE_OUT_DIR` | Nginx document root (e.g. `/var/www/miracletimes/out`) |

Point `FRONTEND_DEPLOY_HOOK_URL` at:

`https://miracletimes.in/hooks/rebuild?token=<REBUILD_HOOK_TOKEN>`

Never commit the token. Hook paths are redacted in API logs; HTTP failures are
logged as errors (a failed hook is never treated as success).

### Optional GitHub Actions

Workflow: `.github/workflows/static-export.yml`

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Production HTTPS API for CI export verification |

Use **workflow_dispatch** for manual rebuild verification. Primary automation
remains the Contabo rebuild webhook from the API.

## Unpublish / delete behavior

- **Archive** or **delete** of a published article queues a rebuild.
- The next successful export **excludes** those slugs from `out/news/`,
  `sitemap.xml`, and `feed.xml`.
- Until that rebuild completes, the previous static HTML may still be reachable.
- Clients that hit a removed path after sync receive the host’s 404 handling
  for missing static files.

## Local development

- `npm run dev` — dynamic article preview; no deploy hook needed.
- `npm run build:export` — full static export (API must be reachable).
- Leave `FRONTEND_DEPLOY_HOOK_URL` empty in **development** so local admin
  saves do not fire production rebuilds. Production requires the HTTPS hook.
