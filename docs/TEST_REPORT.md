# TEST REPORT

_Evidence for phase gates. Append newest at the bottom; record exact commands and results._

## 2026-10-22 — Phase 1 gate (issue #4)

Environment: Linux, Node 26.7.0, pnpm 12.11.2, Playwright 1.64.1 driving Chromium 154
(`PW_CHROMIUM_PATH=/usr/bin/chromium`; CI uses Playwright's bundled Chromium).

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | ✓ |
| `pnpm lint` | ✓ no findings |
| `pnpm typecheck` | ✓ 4 packages |
| `pnpm test` | ✓ 44 passed — core 14, fixtures 17, storage 8, web 5 |
| `pnpm build` | ✓ 9 static routes (incl. `/manifest.webmanifest`) |
| `pnpm e2e` (after build, port 5290) | ✓ 3 passed (~6 s) |

### Gate checklist

- **Deterministic tests for every §3 transition** —
  `packages/fixtures/src/hero-workflow.test.ts` (pure ops, injected clock + ids):
  listing text parses to the 5 fixture requirements; starting states TypeScript/PostgreSQL
  Supported, deployment Uncertain, two case studies Not yet supported ("1 of 2"), language
  Unknown; matcher is a fixed point on the fixture; add 2nd case study → Supported (Opportunity
  Lab data + dossier); remove its claim → back to Not yet supported (dossier too, no dangling
  refs, history has create + delete); deployment proof → Supported, reject → Uncertain (sticks
  across rematch), restore → Supported; unverified-only → Uncertain; language stated → Uncertain,
  linked → Supported; remove TS claim → Uncertain; delete artifact cascades; override wins until
  cleared; redaction withheld from dossier and recorded in history; backup round-trip.
  Same flow through the UI in `apps/web/e2e/hero-workflow.spec.ts` test 1 (Opportunity Lab,
  Proof Graph and Share Studio preview checked after add and after remove).
- **Manual artifact survives reload and offline** — e2e test 2: wait for the service worker to
  control the page, add evidence, reload, `context.setOffline(true)`, reload again and open
  `/opportunities` and `/share` offline: the artifact and the Supported case-study status are
  shown. The test also asserts zero requests to non-localhost hosts. Storage test "applies a
  change atomically and the manual artifact survives a reload" covers close/reopen in IndexedDB.
  Control: with `serviceWorkers: "block"` the test fails (no SW → no offline shell).
- **Export → fresh install import, relations restored, no duplicate ids** — e2e test 3 exports a
  backup through the download, restores it in a new browser context (which had already seeded
  the demo), then checks statuses, inspector coverage, and that the set of ids across every
  IndexedDB store equals the exported set with no duplicates. Unit: storage "restores a backup
  into a fresh install without duplicate ids" (idempotent on repeat), core/fixtures reject
  backups with duplicate ids or dangling references, v1 backups migrate.
- **Migrations** — storage "migrates a v1 database in place" opens a real v1 Dexie database and
  upgrades it (redaction defaulted, `auditEvents` table present, version = `DB_VERSION`).

### Known gaps

- e2e is Chromium-only; no Firefox/WebKit run.
- Parser coverage is keyword-based; tested on the fixture listing, bullets/numbered lists,
  semicolons, whole-word alias matching, eligibility/language/portfolio detection, size bounds.
