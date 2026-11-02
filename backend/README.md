# Miracle Times Backend

Independent Node.js + Express + MySQL API for the Miracle Times news frontend.

## Requirements

- Node.js **20+**
- MySQL / MariaDB with the existing `miracle_times` database and its 10 tables
- Local phpMyAdmin / XAMPP is fine for development

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET
npm install
```

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `DB_*` | MySQL connection |
| `JWT_SECRET` | Signing secret (min 16 chars) |
| `FRONTEND_URL` / `CORS_ORIGINS` | Allowed browser origins |
| `UPLOAD_DIR` | Local upload directory |
| `PUBLIC_BASE_URL` | Public base URL used for uploaded file links |
| `SCHEDULE_INTERVAL_MS` | Scheduled publishing poll interval |

Never commit `.env`.

> If port `4000` is already used on your machine, set `PORT=4001` (and matching `PUBLIC_BASE_URL`) in `.env`.

## Run

```bash
npm run dev      # watch mode
npm start        # production-style start
npm test         # automated tests
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## Administrator setup

There is **no public API** to create admins. Create the first admin with the CLI:

```bash
npm run seed:admin -- --name "Desk Admin" --email desk@miracletimes.in --password 'choose-a-long-password'
```

## Seed bilingual categories

```bash
npm run seed:categories
```

This upserts the 12 frontend demo categories with Hindi and English translations.

## Authentication

```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Login returns a JWT and also sets an httpOnly cookie (`COOKIE_NAME`, default `mt_token`). Send either:

- `Authorization: Bearer <token>`, or
- the cookie automatically from the browser (`credentials: 'include'`)

Roles: `admin`, `editor`, `author`. Inactive users cannot authenticate.

## Public news APIs

Only `published` articles with `published_at <= now` are returned.

```http
GET /api/articles?language=hi&page=1&limit=20
GET /api/articles?language=en&category=lucknow
GET /api/articles?tag=क्रिकेट&q=चारबाग
GET /api/articles/featured
GET /api/articles/breaking
GET /api/articles/trending
GET /api/articles/:slug?language=hi
GET /api/categories?language=hi
GET /api/categories/:slug?language=en
```

Public article payloads are shaped for the existing frontend `Article` type:

- `id` → `public_id`
- `slug`, `title`, `summary`, `content[]`
- `category` (primary slug), `categories[]`
- `image`, `imageAlt`, `imageCaption`, `imagePosition`
- `author`, `publishedAt`, `updatedAt`, `featured`, `breaking`, `tags`, `demoRank`

## Admin article APIs

Protected. Prefer `/admin` paths for ID-based access so they do not collide with public slugs.

```http
GET    /api/articles/admin
GET    /api/articles/admin/:id
POST   /api/articles
PUT    /api/articles/:id
DELETE /api/articles/:id
POST   /api/articles/:id/publish
POST   /api/articles/:id/schedule
POST   /api/articles/:id/archive
```

Article create/update uses a DB transaction across:

`articles`, `article_translations`, `article_content_blocks`, `article_categories`, `article_tags`.

## Categories (admin)

```http
GET  /api/categories/admin
POST /api/categories
PUT  /api/categories/:id
```

## Media

```http
POST   /api/media/upload      # multipart field: file
POST   /api/media/from-url    # { "url": "https://..." }
GET    /api/media
DELETE /api/media/:id
```

- Uploads are validated with MIME + `sharp` metadata inspection
- SVG is rejected
- Files are stored on disk under `UPLOAD_DIR` (not in MySQL)
- External URLs are scheme-checked and SSRF-blocked (localhost / private IPs / link-local / metadata hosts)
- Swap `src/services/storage` later for S3/R2 without changing controllers

## Scheduled publishing

On server start, a background interval (`SCHEDULE_INTERVAL_MS`) publishes due rows:

- `status = 'scheduled'`
- `scheduled_at <= UTC_TIMESTAMP()`

The job uses a transaction + row lock (`FOR UPDATE`) and a process-local overlap guard.

**Production:** keep at least one always-on API process (or move this job to a dedicated worker / systemd timer / cron invoking the same service method). Do not rely on a browser tab.

## Connecting the frontend

1. Keep calling the backend over HTTP — never open MySQL from Next.js.
2. Point a future data layer (for example `lib/api.ts`) at `PUBLIC_BASE_URL` / `NEXT_PUBLIC_API_URL`.
3. Map API article objects onto the existing `Article` type in `lib/types.ts` (already close by design).
4. Enable CORS with `FRONTEND_URL=http://localhost:3000` during local development.

## Production checklist

- Strong unique `JWT_SECRET`
- Restrict `CORS_ORIGINS`
- Terminate TLS in front of Node
- Persist `uploads/` or switch to object storage
- Run DB backups
- Process manager (systemd, PM2, Docker) with restart policy
- Monitor `/api/health`
- Rotate admin passwords; never hardcode credentials
