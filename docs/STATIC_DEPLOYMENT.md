# Historical: static frontend deployment (retired)

> **Status:** Obsolete for production. Miracle Times now uses self-hosted
> Next.js 15 SSR with selective ISR. See
> [CONTABO_DEPLOYMENT.md](./CONTABO_DEPLOYMENT.md).

This document is retained only as a rollback reference for the previous
`output: "export"` + rebuild-webhook architecture.

## Former workflow (do not use for new deploys)

1. Admin publish → API debounce → `FRONTEND_DEPLOY_HOOK_URL`
2. Contabo `rebuild-webhook.mjs` ran `npm run build:export`
3. `out/` was rsync’d to Nginx `root`

## Replacement

- Next.js `next start` behind Nginx
- `POST /api/revalidate` with `X-Revalidate-Token`
- API env: `CACHE_REVALIDATE_URL` + `CACHE_REVALIDATE_TOKEN`
