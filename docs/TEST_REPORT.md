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

## 2026-10-22 — Phase 3 gate (issue #6)

Environment: Linux, Node 26.7.0, pnpm 12.11.2, Playwright 1.64.1 driving the system Chromium
(`PW_CHROMIUM_PATH=/usr/bin/chromium`), e2e on `PORT=5483`; qpdf 12 locally.

| Command | Result |
| --- | --- |
| `pnpm lint` | ✓ no findings |
| `pnpm typecheck` | ✓ 5 packages |
| `pnpm test` | ✓ 69 passed: core 15, fixtures 24, ai 9, storage 8, web 13 |
| `pnpm build` | ✓ static routes incl. `/settings` |
| `pnpm e2e` | ✓ 10 passed: `hero-workflow.spec.ts` 4 (unchanged), `phase3.spec.ts` 6 |

### Gate checklist

- **Consent + egress: nothing leaves without explicit opt-in.**
  - `packages/ai/src/ai.test.ts`: a fetch spy is never called when AI is off by default,
    enabled without consent, consent revoked, consent given for another origin, or the
    endpoint is off-device. `guardedFetch` refuses before any I/O. Only loopback endpoints can
    be consented to. With consent, the body sent equals the previewed body (fields `model`,
    `prompt`, `stream`, `format`, `options`), with `credentials: omit` and `redirect: error`.
    The egress log holds metadata, not content.
  - e2e "AI is off by default": the full flow (Settings, Opportunity Lab import, Share Studio)
    makes zero requests to any origin other than the app's.
  - e2e "enabling without ticking consent is impossible, and cloud endpoints are refused".
  - e2e "with consent": consenting and previewing send nothing. Send makes exactly one POST to
    `localhost:11434/api/generate` (mocked by Playwright) with the previewed body. After revoke,
    no further egress.
- **AI disabled → all Phase 1 e2e tests still pass:** the 4 `hero-workflow.spec.ts` tests pass
  unchanged in the same run. The deterministic paths are also unit-tested as identical to the
  fallback (`suggestRequirements` returns `parseRequirements` output in every refused or failed
  case), and e2e "endpoint down" shows the fallback message and imports only the
  deterministic requirements.
- **Localization smoke EN/FR/AR incl. RTL:** `apps/web/src/lib/i18n.test.tsx` checks catalog
  key and placeholder parity, that Arabic is Arabic script, localized dates, that Arabic sets
  `<html dir=rtl lang=ar>` with Arabic nav and headings and French switches back to LTR, and
  the boot-script whitelist. e2e "localization smoke": FR nav, heading, status ("Étayée") and
  date ("2 févr. 2026"); AR `dir=rtl`, heading, status ("مدعوم"), date ("2 فبراير 2026"),
  computed `direction: rtl`, brand placed to the right of the nav; persists across navigation
  and reload; back to EN. Checked visually in Chromium: Arabic shell RTL, English user data
  reads LTR inside it.
- **PDF export produces a valid, source-linked dossier:** `packages/fixtures/src/pdf.test.ts`
  checks the structure (every xref offset lands on its `N 0 obj`, `startxref` lands on the
  xref table, stream lengths are exact), that output is deterministic, has no
  JS/launch/embedded files, contains every requirement, claim, source label, capture date and
  SHA-256 from the JSON dossier, has a URI link annotation for an http(s) source, applies the
  same disclosure as the JSON (private evidence absent, partial redaction has no excerpt),
  uses French labels, counts replaced characters, and paginates. `qpdf --check`: "No syntax
  or stream encoding errors" (when qpdf is installed). e2e "PDF export" downloads through the
  UI, checks content and disclosure against the preview, and checks French labels plus
  `/Lang (fr)`. `pdftotext` on a sample shows the expected layout.
