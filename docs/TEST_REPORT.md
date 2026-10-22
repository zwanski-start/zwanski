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

## 2026-10-22 — Phase 2 gate (issue #5)

Environment: Linux, Node 26.7.0, pnpm 12.11.2, Playwright 1.64.1, Chromium 154
(`PW_CHROMIUM_PATH=/usr/bin/chromium`, headless, extension loaded with `--load-extension`).

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | ✓ |
| `pnpm lint` | ✓ no findings |
| `pnpm typecheck` | ✓ 5 packages |
| `pnpm test` | ✓ 72 passed — core 25, extension 13, fixtures 18, storage 8, web 8 |
| `pnpm build` | ✓ web (10 static routes) + extension `.output/chrome-mv3` + "Manifest audit passed" |
| `pnpm e2e` | ✓ web 4 passed, extension 3 passed |

### Gate checklist

- **No passive capture** — manifest audit (no host permissions/content scripts); e2e
  "no passive capture": visiting hostile pages leaves the queue empty, manifest has no content
  scripts; nothing is stored before *Confirm & queue*, *Discard* stores nothing.
- **Hostile page cannot drive the extension** — `http://hostile.test` has no `chrome.runtime`;
  `http://127.0.0.1:5299` (matches `externally_connectable`) gets
  `{ok:false,"This page is not your ProofBridge app."}` for list, ack and a forged `save`.
  Mutation control: dropping the exact-origin comparison in `lib/router.ts` → this test fails.
  Router unit tests cover remote/look-alike/other-port/iframe/other-extension/no-origin senders
  and out-of-protocol messages; outbox drops tampered stored entries.
- **Hostile content inert** — captured text excludes `display:none` payload, main-world
  `getSelection`/`innerText` overrides, password value and `<nav>`; `<img onerror>` markup is
  kept as text and rendered in a `<pre>` (jsdom: no `<img>` element created); no dialog fires; the
  injected requirement line stays *Unknown*; malformed extension responses are refused.
- **Loadable artifact** — `apps/extension/.output/chrome-mv3` loaded unpacked in Chromium 154:
  id `gnhdodgpophcenhldkahdaigmpodnmlm`, permissions `activeTab, scripting, storage`, no host
  permissions; popup renders. CI uploads it as `proofbridge-extension-chrome-mv3`. Manual load +
  capture flow: `QUICKSTART.md` §7.
- **Import into the vault** — e2e imports the listing (Opportunity Lab: TypeScript *Supported*,
  case studies *Not yet supported*, source label `Browser capture cap_… · hostile.test`) and the
  excerpt (inspector: source address, `selected-webpage`); extension queue empty after ack; file
  fallback imports a downloaded queue when the app origin is not the configured one.

### Known gaps

- Playwright's bundled Chromium could not be downloaded locally; CI installs it and runs the
  extension suite with `channel: "chromium"` (full Chromium, new headless).
- Chromium only; no Firefox/WebKit, no Web Store package.
