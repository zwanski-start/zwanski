# DEPLOYMENT PLAN

**Status: plan only. Nothing has been deployed.** Live deployment needs founder approval and
accounts the agents do not hold (directive §6/§12). Never deploy onto existing Zwanski or
Vulzero domains.

## 0. Local first (supported today)

| Piece | Command | Notes |
| --- | --- | --- |
| App (dev) | `pnpm dev` | <http://localhost:3000> |
| App (production) | `pnpm build && pnpm --filter @proofbridge/web start` | service worker active |
| App (static export) | `pnpm release && pnpm preview:static` | <http://localhost:4173>, same files a static host would serve |
| Share service (optional) | `pnpm share-server` | <http://127.0.0.1:8787>, loopback only, JSON file store |
| Extension | load `apps/extension/.output/chrome-mv3` unpacked | or the release zip |

No Docker, no database server, no API key.

## 1. Static frontend (Cloudflare Pages-compatible) — planned, gated

The app is a set of client-rendered shells over IndexedDB; `PROOFBRIDGE_STATIC_EXPORT=1` makes
`next build` emit a fully static site (`apps/web/.next-export`, packaged as
`proofbridge-web-static.tar.gz`). Any static host works; Cloudflare Pages specifically:

1. Founder creates a Pages project on a **new** domain/subdomain (not Zwanski/Vulzero).
2. Upload the extracted `proofbridge-web-static.tar.gz` (direct upload) or configure the build:
   command `pnpm install --frozen-lockfile && PROOFBRIDGE_STATIC_EXPORT=1 pnpm --filter @proofbridge/web build`,
   output directory `apps/web/.next-export`, Node ≥ 22.
3. `_headers` in the export sets CSP, `nosniff`, `no-referrer`, a restrictive
   `Permissions-Policy`, `frame-ancestors 'none'`, and `no-cache` on `sw.js`.
   If online share links are not offered, tighten `connect-src` to `'self'`.
4. Clean URLs (`/evidence` → `evidence.html`) are handled by Pages by default.

Consequences to accept before going live:
- Each origin has its **own** IndexedDB. Data in `localhost:3000` does not appear on the hosted
  site; users move it with a (preferably encrypted) backup.
- The capture extension only talks to `localhost` / `127.0.0.1` (`externally_connectable`). On a
  hosted origin captures use the **file fallback** until the extension is rebuilt with that origin
  (a security review item).
- Hosting the static files adds a party that can change the app's code (the host / whoever
  controls the account). Users who need to avoid that should run it locally.

## 2. Share service — planned, gated

`apps/share-server` is a zero-dependency Node service with a Fetch-API handler
(`createHandler(Request) → Response`) and a JSON-file store.

Option A — small VM / container-less Node host (closest to what is tested):
- Node ≥ 22.18, `HOST=127.0.0.1`, behind a TLS reverse proxy (Caddy/nginx) with
  `TRUST_PROXY=1` so rate limits key on the real client address.
- `ALLOWED_ORIGINS=https://<app origin>`; `SHARE_DATA_FILE` on a private, backed-up path (mode 0600).
- Separate domain from the app is fine (CORS is per configured origin).

Option B — Cloudflare Workers (not implemented): the handler already uses `Request`/`Response`
and WebCrypto, but `ShareStore` uses `node:fs`. Needs a KV/D1/Durable Object store adapter with
the same expiry/revocation semantics and its own tests before use.

Before exposing it publicly: decide retention for tombstones (30 days today), monitoring for
`5xx`/`429`, abuse contact, and a privacy notice (the service sees client IPs at the transport
layer even though it stores none).

## 3. Sync — not built

Optional multi-device sync (e.g. Supabase/PostgreSQL with per-user RLS) is **not implemented**.
Requirements before it can start: provider account (founder approval), conflict semantics
(per-record `updatedAt` + audit log merge, deletions as tombstones), RLS policies with
tenant-isolation tests, export portability, and a key-ownership design if it is to be encrypted.
Until then the portable path is the encrypted backup file.

## 4. Rollback

- Static frontend: re-upload the previous release tarball (checksums in `SHA256SUMS`). User data
  is in their browser and unaffected; schema migrations are forward-only, so never roll back
  across a `SCHEMA_VERSION` bump without a restore plan.
- Share service: stop the process; links fail closed (viewer shows "could not be reached").
  Restore `shares.json` from backup to resume; revocations recorded in it stay revoked.
