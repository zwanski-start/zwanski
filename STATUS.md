# STATUS

_Truth-based progress only. Do not mark unimplemented features complete._

## 2026-10-22 — Phase 0 seed
- **What works:** repository seeded with canonical build directive and governance stubs.
- **Tests:** none yet (no code).
- **What does not work:** everything else — no app, no packages, no extension, no demo.
- **Security risks:** n/a (no code paths yet).
- **Next concrete step:** CEO/architect read `docs/MASTER_BUILD_PROMPT.md`, create the pnpm
  monorepo skeleton + synthetic fixtures (Phase 0 gate: app boots locally with no API key and
  renders fixture-driven data), then begin the Phase 1 end-to-end vertical slice.
- **Founder approval required:** none at this stage.

## 2026-10-22 — Project harness added
- **What works:** repo now ships a project-scoped Claude Code harness so every cubefarm agent
  clone loads it automatically: `CLAUDE.md` (auto-read context + safety rails), the §8 specialist
  team in `.claude/agents/` (product-lead, architect, core-data-engineer, web-engineer,
  extension-engineer, ui-ux-engineer, ai-engineer, security-engineer, qa-engineer,
  release-engineer), and `docs/HARNESS.md` (how to add safe MCP servers; `.mcp.json` git-ignored).
- **Tests:** none yet (still no app code).
- **Next concrete step:** unchanged — CEO/architect scaffold the monorepo + fixtures (Phase 0 gate).

## 2026-10-22 — Phase 0 monorepo skeleton + synthetic fixtures (issue #3)
- **What works:** pnpm workspace (`apps/web`, `packages/{core,storage,fixtures,config}`). Zod
  schemas for 10 domain entities with provenance fields; a DEMO / SYNTHETIC §3 dataset (3 sources,
  3 artifacts with real SHA-256 of their synthetic bytes, 4 claims, 3 skills, 1 opportunity, 5
  requirements in the §3 starting states, 3 bridge tasks); a versioned Dexie IndexedDB store
  (seed / import / export / clear). The Next.js app boots with no API key, seeds IndexedDB on first
  load and renders Compass, Evidence Vault, Opportunity Lab, Proof Graph (accessible list view) and
  Bridge Plan from persisted data. Share Studio is an explicit "Phase 1" placeholder. Next
  telemetry disabled. CI workflow runs lint/typecheck/test/build on PRs.
- **Tests:** from a fresh `git clone` + `pnpm install --frozen-lockfile` (Node 26.7, pnpm 12.11.2):
  `pnpm lint` ✓, `pnpm typecheck` ✓ (4 packages), `pnpm test` ✓ — 19 tests (core 5, fixtures 5,
  storage 4, web 5) incl. fixture referential integrity, hash stability vs. bytes, §3 states,
  IndexedDB round-trip and persistence across close/reopen, and a jsdom render of Compass and
  Opportunity Lab from IndexedDB with `fetch` never called. `pnpm build` ✓ (7 static routes);
  `pnpm --filter @proofbridge/web start` served `/opportunities`. Manually checked in a browser
  via Playwright on `pnpm dev`: all pages render fixture data, no requests to any non-localhost
  origin.
- **What does not work:** no import/edit/delete UI, no deterministic matcher (requirement status
  is a stored snapshot), no interactive 2D graph, no dossier export, no PWA/service worker, no
  extension, no Playwright e2e suite in CI, no FR/AR. Entities `Dossier`, `DossierItem`,
  `CaptureEvent`, `ConsentGrant`, `ExternalIntegration`, `AuditEvent` and link revision history
  are not modelled yet.
- **Security risks:** none new at runtime (no network, no inputs beyond the bundled fixture).
  No CSP headers configured yet; threat model in `SECURITY.md` is still a placeholder.
- **Next concrete step:** Phase 1 — deterministic matching engine in `core` that recomputes
  requirement status from links; manual evidence entry + delete in the Evidence Vault; Playwright
  smoke test for the §3 transitions (add/remove case study, reload, offline).
- **Founder approval required:** none.

## 2026-10-22 — Phase 1 vertical slice: Evidence Vault + deterministic matching (issue #4)
- **What works:** add evidence from typed text or a local file (read + SHA-256 in the browser);
  Evidence Vault inspector per artifact with source, capture/added/changed dates, coverage
  (requirements it backs), visibility + redaction (none/partial/redacted), claims (remove) and an
  append-only change history; delete artifact (cascades claims/links). Opportunity Lab: paste a
  listing → deterministic keyword parser → requirements → deterministic matcher; each
  requirement shows status, reason and the claims behind it; reject/restore a match, link a claim
  by hand, or set a status decision with a note. The §3 demo states are now *computed* by the
  matcher (fixture no longer hand-writes links). Share Studio: `proofbridge.dossier` v1 JSON
  preview + download (private/redacted withheld), vault backup export and validated
  replace-restore. Compass: state working languages. Schema v2 (Dexie migration v1→v2 +
  `migrateDataset` for v1 backups). PWA manifest + app-shell-only service worker (production).
- **Tests:** `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ 44 tests (core 14, fixtures 17,
  storage 8, web 5), `pnpm build` ✓, `pnpm e2e` ✓ 3 Playwright tests on the production build
  (every §3 transition through the UI; manual artifact survives reload and offline; backup →
  fresh-context restore with unique ids). Details: `docs/TEST_REPORT.md`.
- **What does not work / limits:** Proof Graph is still the accessible list view (no 2D graph);
  Bridge Plan tasks are not editable and not generated for new gaps; no `Dossier`/`DossierItem`
  entities (dossier derived on demand); parser is keyword-based and only knows the vault's
  skills (unknown skills become "other"/Unknown); a "case study" is any `write-up` artifact;
  claim text cannot be edited (remove + re-add); no FR/AR; no PDF; e2e covers Chromium only.
  Locally `playwright install` could not finish downloading, so e2e ran against the system
  Chromium 154 via `PW_CHROMIUM_PATH`; CI installs Playwright's own Chromium.
- **Security notes:** all input (listing text, files, backups) is bounded and treated as data —
  React-escaped rendering, no eval/HTML injection, backups JSON-parsed + schema/integrity
  validated before a single-transaction replace. Service worker caches only shell HTML and
  hashed static assets, never vault data. No network calls at runtime (asserted in e2e). Still no
  CSP headers; `SECURITY.md` threat model still a placeholder.
- **Next concrete step:** interactive Proof Graph from `requirementPaths`; Bridge Plan editing and
  gap-driven task suggestions; CSP headers + threat model; then Phase 2 extension.
- **Founder approval required:** none.

## 2026-10-22 — Phase 2: Chromium MV3 capture extension + trust boundaries (issue #5)
- **What works:** `apps/extension` (WXT 0.21, MV3) with only `activeTab`, `scripting`, `storage`
  — no host permissions, no content scripts, no `<all_urls>`; a manifest audit fails `pnpm build`
  if that changes. Toolbar popup: **Capture this opportunity** (visible text of the page's main
  content) / **Save selected evidence** (selection) → plain-text extraction in Chrome's isolated
  world → sanitised, editable preview → **Confirm & queue** (or Discard; nothing stored) → local
  queue (max 20, delete/delete-all). **Send to local ProofBridge** opens the app's new **Capture
  Inbox** (`/inbox`), which pulls the queue over `externally_connectable` (localhost only; the
  background also requires the exact configured app origin, a top frame and the strict protocol:
  `ping`/`list`/`ack` — nothing can create or trigger a capture). The user imports each capture
  as an opportunity (requirements parsed) or private evidence (`captureMethod:
  selected-webpage`, page URL + capture time as provenance) or discards it; imported captures
  are acked and removed from the extension. Fallback: download the queue as a JSON capture file
  and import it in the inbox. Extension id pinned by a public manifest key. Threat model:
  `SECURITY.md` § Capture extension; boundaries: `ARCHITECTURE.md` § Browser capture.
- **Tests:** `pnpm lint` ✓, `pnpm typecheck` ✓ (5 packages), `pnpm test` ✓ 72 tests (core 25,
  extension 13, fixtures 18, storage 8, web 8), `pnpm build` ✓ (web 10 routes + extension build +
  manifest audit), `pnpm e2e` ✓ web 4 + extension 3 Playwright tests in Chromium 154 with the
  extension loaded unpacked: no passive capture (hostile remote page has no `chrome.runtime`;
  hostile page on another local origin gets `ok:false` for list/ack/forged save; queue empty;
  no content scripts); click → preview → confirm → import with hidden payload, main-world
  monkey-patching, password field and nav excluded and `<img onerror>` text kept inert; injected
  "ignore all prior instructions" line stays an *Unknown* requirement; app made no off-machine
  requests; file fallback when the origin is not the configured one. Control: removing the
  exact-origin check makes the hostile-local test fail. Details: `docs/TEST_REPORT.md`.
- **What does not work / limits:** no Chrome Web Store / Firefox build; `chrome.storage.local`
  and IndexedDB are unencrypted; any page on the configured app origin can read/clear the queue;
  `innerText` still includes visually-hidden-but-rendered text (the preview is the control);
  `CaptureEvent`/`ConsentGrant` entities not modelled (provenance lives on source/opportunity);
  e2e needs a test build with a host permission for the fictional `hostile.test` (Playwright cannot
  click the toolbar); locally ran on system Chromium (`PW_CHROMIUM_PATH`) — CI uses Playwright's.
- **Security notes:** see `SECURITY.md`. No network calls added; no credentials, cookies, history
  or form values are read.
- **Next concrete step:** interactive Proof Graph, Bridge Plan editing, CSP headers; Phase 3
  provider-optional intelligence + localization.
- **Founder approval required:** none (Web Store publishing would need an account — not done).
