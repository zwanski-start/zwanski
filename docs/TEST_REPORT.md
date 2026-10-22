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

## 2026-10-22 — Phase 4 gate (issue #7)

Environment: Linux, Node 26.7.0, pnpm 12.11.2, Playwright 1.64.1 driving system Chromium 154
(`PW_CHROMIUM_PATH=/usr/bin/chromium`; CI uses Playwright's Chromium), @axe-core/playwright 4.x.

| Command | Result |
| --- | --- |
| `pnpm lint` | ✓ no findings |
| `pnpm typecheck` | ✓ 6 packages |
| `pnpm test` | ✓ 95 passed — core 32 (+7 crypto), extension 13, fixtures 18, share-server 13 (new), storage 8, web 11 (+3 share client) |
| `pnpm build` | ✓ web 10 routes + extension (manifest audit passed) |
| `pnpm e2e` | ✓ web 11 (4 existing + 7 Phase 4) + extension 3 |
| `pnpm release` | ✓ `dist/release/<version>-<sha>/`: web static tar.gz (~294 KB), extension zip (~59 KB, re-audited), share-server tar.gz (~10 KB), `SHA256SUMS`, `release.json` |

### Gate checklist

- **Release checklist + build artifacts** — `docs/RELEASE_CHECKLIST.md`; `pnpm release` (also in CI,
  uploaded as `proofbridge-release`). Static export checked by hand: `pnpm preview:static` on
  port 5290 + share service on 5297 → Share Studio created a link under the `_headers` CSP and the
  viewer rendered the dossier; no console errors.
- **Share links honour expiry + revocation** — `apps/share-server/src/share.test.ts` (injected
  clock): served until `expiresAt`, `410 expired` one second later, ciphertext deleted; TTL bounds;
  revoke → `410 revoked` immediately, idempotent, survives restart (file store); per-owner cap;
  CORS allowlist; malformed/oversized/extra-field bodies; read rate limit; no plaintext stored;
  viewer CSP hash-pinned; real HTTP round-trip. e2e `phase4.spec.ts` "share link": off by default
  → enable with consent → create (request body has no title and no key) → separate browser reads
  the dossier (axe: 0 violations) → link without key refused → owner revokes → viewer shows revoked
  → second link expires when the server clock passes 1 h → app shows Expired → turn off.
- **Sync tenant-isolation + conflict tests** — sync is **not built**. Owner isolation of shares is
  tested ("an owner can neither list nor revoke another owner's shares").
- **Encrypted backup** — core: round-trip, 600k default, fresh salt/IV, wrong passphrase,
  tampered ciphertext and header (AAD), weak passphrase, hostile KDF cost, unknown fields, size.
  e2e: export → plain restore points to encrypted restore → wrong passphrase refused → correct one
  restores in a fresh context.
- **Accessibility** — e2e: axe-core WCAG 2.0/2.1 A+AA on all 7 screens in light and dark mode,
  0 violations (control: `color-contrast` is among the passing rules on every page, so the rule set
  really ran); share Set-up form included. Keyboard: skip link first, all 7 nav routes reached by
  Tab with a non-`none` outline, Enter activates. Screen-reader node inspection: every requirement
  and every linked claim from IndexedDB appears in the `main` accessibility tree (ariaSnapshot).
  No a11y fixes were needed in this pass.
- **Performance** (production build, SW blocked, localhost; measured):

  | Route | DCL ms | vault rendered ms | JS gzip KB | JS raw KB |
  | --- | --- | --- | --- | --- |
  | `/` | 27 | 182 | 234 | 769 |
  | `/evidence` | 32 | 94 | 234 | 769 |
  | `/opportunities` | 21 | 106 | 234 | 769 |
  | `/graph` | 22 | 79 | 234 | 769 |
  | `/plan` | 19 | 65 | 234 | 769 |
  | `/inbox` | 21 | 78 | 227 | 745 |
  | `/share` | 21 | 83 | 234 | 769 |

  Budgets asserted: DCL < 1.5 s, rendered < 3 s, JS < 300 KB gzip / < 1 000 KB raw. Localhost
  numbers say nothing about slow networks/devices; no throttled or Lighthouse run was done.

### Known limitations

- No sync; no live deployment; share service Workers/KV adapter not written.
- Static-export CSP needs `script-src 'unsafe-inline'`; `next start` sends no CSP.
- e2e ran on system Chromium only.
