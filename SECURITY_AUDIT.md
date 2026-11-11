# Miracle Times — Security & Code-Quality Audit

**Project:** Miracle Times (`miracletimes.in`)  
**Repository:** `/Users/admin/miraclenews`  
**Initial audit date:** 2026-11-11  
**Remediation pass:** 2026-11-11 (Critical / High / Medium only)  
**Mode:** Code + docs remediations applied **locally**. No commit, push, Contabo, DNS, Cloudflare, Namecheap, Vercel, or production DB changes.  
**Target VPS (not modified):** Contabo `5.183.35.64`  

---

## Executive summary (post-remediation)

Critical and High dependency findings for production runtime are **cleared**. Backend authorization, listen-binding, CSRF, JWT logout revocation, SSRF IP checks, Contabo deploy templates, and backup scripts are in place. Automated tests: **backend 55 pass**, **SEO 11 pass**, **typecheck pass**, **lint pass** (2 pre-existing unused-var warnings).

**Launch-readiness verdict:** **Conditionally ready to deploy** after you review this summary, approve commit/push, and apply Contabo configs in a controlled window. Live TLS/header verification on the VPS is still **operator-owned** and was not performed.

| Severity | Open (verified) | Remediated this pass |
|---|---|---|
| CRITICAL | 0 | 1 (C-01) |
| HIGH | 0 | 4 (H-01–H-04) |
| MEDIUM | 0 open code gaps; residual tradeoffs documented | 5 (M-01–M-05) |
| LOW | unchanged (not in scope) | — |
| INFORMATIONAL | see below | — |

**Remaining non-blocking risks**

- Production `npm audit --omit=dev`: **0** vulnerabilities  
- Full `npm audit` (includes eslint toolchain): **6 moderate** (`minimatch` via `@typescript-eslint/*`) — dev-only  
- CSP still allows `'unsafe-inline'` for **JSON-LD** (boot script moved to `/lang-boot.js`)  
- JWT denylist is **in-process** (fine for one API process; not multi-replica)  
- Contabo Nginx/systemd not applied yet (templates only)  
- Uncommitted local changes (demo removal + this remediation) still need your commit approval  

---

## Remediation status

| ID | Finding | Status | What changed |
|---|---|---|---|
| **C-01** | Next.js Critical advisory | **Fixed** | Upgraded `next` / `eslint-config-next` to **15.5.29** (no Next 16 major) |
| **H-02** | PostCSS High via Next | **Fixed** | `overrides.postcss = 8.5.32`; prod audit clean |
| **H-01** | Vercel-centric Contabo gap | **Fixed (templates)** | `deploy/contabo/*`, `docs/CONTABO_DEPLOYMENT.md`, docs retargeted; no live host changes |
| **H-03** | Listen all interfaces | **Fixed** | Production defaults `LISTEN_HOST` to `127.0.0.1` when unset |
| **H-04** | Media delete IDOR | **Fixed** | Authors delete own media only; admin/editor any |
| **M-01** | Logout does not revoke JWT | **Fixed** | `jti` claim + in-process denylist on logout; default TTL **12h** |
| **M-02** | Bearer skips Origin CSRF | **Fixed** | Disallowed Origin rejected even with Bearer; Bearer w/o Origin still OK for non-browser clients |
| **M-03** | CSP unsafe-inline | **Partially fixed** | Language boot → `/lang-boot.js` + `beforeInteractive`; JSON-LD still needs `'unsafe-inline'` (documented) |
| **M-04** | Incomplete private IP checks | **Fixed** | Expanded CGNAT / TEST-NET / IPv6 / mapped IPv4 checks |
| **M-05** | No backup automation | **Fixed (script)** | `deploy/contabo/backup.sh` + Contabo runbook; restore drill still operator |

### Security tradeoffs (intentional)

1. **JWT revocation** is memory-local. One systemd API process on Contabo is the assumed model. Horizontal multi-instance needs Redis/DB denylist before scaling.
2. **CSP** cannot drop `'unsafe-inline'` while JSON-LD remains inline without SEO/markup redesign.
3. **Rebuild webhook token** travels in HTTPS query string (same class as Vercel deploy hooks). Rotate if leaked; TLS required.

---

## Technology stack (current)

| Layer | Technology |
|---|---|
| Frontend | Next.js **15.5.29**, React 19, TypeScript, static export |
| PostCSS (overridden) | **8.5.32** |
| API | Express 4 + Zod + Helmet + MySQL (`mysql2`) |
| Auth | HttpOnly cookie JWT + `jti` revocation denylist |
| Prod hosting plan | Contabo Nginx static + API reverse proxy (`docs/CONTABO_DEPLOYMENT.md`) |

---

## Dependency audit results (after remediation)

### Frontend production (`npm audit --omit=dev`)

**0 vulnerabilities**

### Frontend full tree (`npm audit`)

| Severity | Count | Notes |
|---|---|---|
| critical | 0 | Cleared |
| high | 0 | Cleared |
| moderate | 6 | DevDependency `@typescript-eslint` → `minimatch` DoS advisory |
| low | 0 | |

Installed: `next@15.5.29`, `postcss@8.5.32` (override).

### Backend (`npm audit`)

**0 vulnerabilities**

---

## Test results (remediation pass)

| Suite | Result |
|---|---|
| `cd backend && npm test` | **55 pass** / 0 fail (includes new media authz, CSRF Bearer, JWT revocation, expanded SSRF, env LISTEN_HOST) |
| `npm run test:seo` | **11 pass** |
| `npm run typecheck` | pass |
| `npm run lint` | pass (warnings only: unused `t` in `ArticleCard` / `LeadStory` — pre-existing, out of C/H/M scope) |

---

## Contabo deployment plan (prepared, not applied)

Authoritative operator guide: **[docs/CONTABO_DEPLOYMENT.md](docs/CONTABO_DEPLOYMENT.md)**

Templates (Miracle Times only — do not overwrite Miracle Drugs vhosts):

| Path | Purpose |
|---|---|
| `deploy/contabo/nginx-miracletimes.in.conf` | Static site + security headers + `/hooks/rebuild` |
| `deploy/contabo/nginx-api.miracletimes.in.conf` | API TLS proxy to `127.0.0.1:4000` |
| `deploy/contabo/miracle-times-api.service` | systemd API unit |
| `deploy/contabo/miracle-times-rebuild.service` | systemd rebuild webhook |
| `deploy/contabo/rebuild-webhook.mjs` | Token-gated `build:export` + `rsync` |
| `deploy/contabo/backup.sh` | `mysqldump` + uploads tarball |

**Not done (awaiting your approval):** git commit/push, Contabo install, DNS/TLS changes, production env creation, live traffic cutover.

---

## Original findings (reference) — code remediations

### CRITICAL — remediated

#### C-01 — Next.js Critical range → fixed at 15.5.29

### HIGH — remediated

#### H-01 — Contabo config replaces Vercel-first assumptions (templates + docs)  
#### H-02 — PostCSS overridden to 8.5.32  
#### H-03 — Production `LISTEN_HOST` defaults to `127.0.0.1` (`backend/src/config/env.js`)  
#### H-04 — `deleteMedia(id, actor)` ownership checks (`mediaService.js` / `mediaController.js`)

### MEDIUM — remediated / documented

#### M-01 — `tokenRevocation.js` + logout revoke + default `JWT_EXPIRES_IN=12h`  
#### M-02 — CSRF Origin enforced when Origin present, even with Bearer  
#### M-03 — External `/lang-boot.js`; residual JSON-LD `'unsafe-inline'`  
#### M-04 — Expanded `isPrivateIp` + SSRF tests  
#### M-05 — `deploy/contabo/backup.sh` + runbook

### LOW / INFORMATIONAL — not remediating in this pass

L-01 unused frontend `mysql2`, L-02 logout auth, L-03 404 path echo, L-04 CI Node 20 vs Contabo 24, L-05 uncommitted demo removal (still present locally with this work).

---

## Prioritized next steps (for you)

**Before Contabo cutover**

1. Approve git commit (demo removal + this remediation) — **not done**  
2. Review `docs/CONTABO_DEPLOYMENT.md` and schedule a change window  
3. On Contabo: install Nginx/systemd/env/backups **without** touching Miracle Drugs  
4. Verify headers/health with `curl` after TLS  
5. Optional: clear remaining **moderate** eslint/`minimatch` advisories via `npm audit fix` (dev-only)

---

## Final assessment

| Question | Assessment |
|---|---|
| Critical/High code & dependency issues cleared? | **Yes** (prod audit clean) |
| Medium items addressed? | **Yes**, with documented residual CSP + single-process JWT denylist |
| Contabo plan ready in-repo? | **Yes** (`docs/CONTABO_DEPLOYMENT.md` + `deploy/contabo/`) |
| Production modified? | **No** |
| Safe to claim “fully secure forever”? | **No** — live verification + ops discipline still required |

**Awaiting your approval** before commit, push, or any Contabo/DNS/host changes.
