# Static frontend deployment

Miracle Times serves the public site as a Next.js **static export** (`out/`).
Article HTML, metadata, sitemap, and RSS are generated at **build time** from
the live API. Database writes alone do not change public pages.

## Publish → live site workflow

1. An authenticated admin publishes, updates, archives, or deletes a
   **public-facing** article (or the scheduled publisher promotes due articles).
2. The API queues a **debounced** rebuild (`FRONTEND_DEPLOY_DEBOUNCE_MS`,
   default 45s) so rapid edits collapse into one deploy.
3. The API `POST`s to `FRONTEND_DEPLOY_HOOK_URL` (Vercel Deploy Hook). The hook
   URL is a secret; it is never exposed to the browser.
4. Vercel starts a new production deployment. Build command:
   `npm run build:export`. Output directory: `out`.
5. The build fetches published articles from `NEXT_PUBLIC_API_URL` (must be the
   production HTTPS API). Failed builds do **not** promote a new deployment.
6. After a successful deploy, new/updated HTML is live. Unpublished or deleted
   articles are omitted from `generateStaticParams`, sitemap, and RSS on the
   next successful build. Stale HTML paths may linger on the CDN until that
   deploy finishes (and until old paths are overwritten/removed by the new
   `out/` upload).

Draft-only edits do **not** trigger a rebuild.

## Required configuration (names only)

### API host environment

| Variable | Purpose |
|---|---|
| `FRONTEND_DEPLOY_HOOK_URL` | Vercel Deploy Hook HTTPS URL (**required** when `NODE_ENV=production`; API refuses to start without it) |
| `FRONTEND_DEPLOY_DEBOUNCE_MS` | Optional debounce (default `45000`) |

### Vercel project

| Setting | Value |
|---|---|
| Build Command | `npm run build:export` |
| Output Directory | `out` |
| `NEXT_PUBLIC_API_URL` | Production HTTPS API origin (no trailing slash) |

Create the Deploy Hook under **Vercel → Project → Settings → Git → Deploy Hooks**
(production branch). Paste the URL into the API host as
`FRONTEND_DEPLOY_HOOK_URL`. Never commit it, never put it in `NEXT_PUBLIC_*`,
and never expose it to browser JavaScript. Hook paths are redacted in API logs;
HTTP failures are logged as errors (a failed hook is never treated as success).

### Optional GitHub Actions

Workflow: `.github/workflows/static-export.yml`

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Production HTTPS API for CI export verification |

Use **workflow_dispatch** for manual rebuilds. Primary automation remains the
Vercel Deploy Hook from the API.

## Unpublish / delete behavior

- **Archive** or **delete** of a published article queues a rebuild.
- The next successful export **excludes** those slugs from `out/news/`,
  `sitemap.xml`, and `feed.xml`.
- Until that deploy completes, the previous static HTML may still be reachable.
- Clients that hit a removed path after deploy receive the host’s 404 handling
  for missing static files.

## Local development

- `npm run dev` — dynamic article preview; no deploy hook needed.
- `npm run build:export` — full static export (API must be reachable).
- Leave `FRONTEND_DEPLOY_HOOK_URL` empty in **development** so local admin
  saves do not fire production deploys. Production requires the HTTPS hook.
