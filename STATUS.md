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

## 2026-10-22 — Phase 3: optional provider intelligence + EN/FR/AR + PDF (issue #6)
- **What works:**
  - **Optional AI, off by default.** New `packages/ai`. Settings → "AI assistance" accepts only
    a model endpoint on this machine (Ollama-compatible, `localhost`/`127.0.0.1`/`[::1]`). It
    needs an explicit consent checkbox, and the grant covers one exact origin plus the scope
    "listing-text". In Opportunity Lab the user previews the exact JSON request, then clicks
    Send. The model's lines come back as unverified checkboxes. Ticked lines become
    requirements marked "AI-suggested, accepted by you"; their status is still computed by the
    deterministic matcher. Any refusal or failure falls back to the deterministic parser and
    shows the reason. Settings shows a metadata-only egress log and can revoke consent.
  - **Localization:** EN/FR/AR language switcher in the header and Settings. `<html lang dir>`
    is applied before paint. Arabic renders RTL, mixed-script user data keeps its own
    direction, and dates are localized (Arabic month names with Latin digits). Translated: the
    shell, navigation, all page headers, status labels, Compass, Share Studio, Settings, the
    Opportunity Lab table headers and the AI panel.
  - **PDF dossier:** Share Studio → "Download dossier (PDF)". Dependency-free PDF 1.7 from the
    same `Dossier` object as the JSON export, so disclosure is identical. Each evidence item
    lists its source, capture date and SHA-256. http(s) sources are clickable, and the PDF
    paginates with a page footer. PDF labels follow the UI language for EN and FR.
- **Tests:** `pnpm lint` ✓, `pnpm typecheck` ✓ (5 packages), `pnpm test` ✓ 69 tests (core 15,
  fixtures 24 incl. 6 PDF, ai 9, storage 8, web 13 incl. 8 i18n), `pnpm build` ✓,
  `pnpm e2e` ✓ 10 Playwright tests: the 4 Phase 1 tests unchanged plus 6 Phase 3 tests
  (zero egress with AI off; consent gating; exact-payload send + accept + revoke; endpoint-down
  fallback; EN→FR→AR RTL smoke with reload; PDF export). Locally the PDF also passes
  `qpdf --check`, and that test is skipped where qpdf is not installed. Details:
  `docs/TEST_REPORT.md`.
- **What does not work / limits:**
  - **Translation is partial.** Evidence Vault forms and inspector, requirement review
    controls and the matcher's rationale sentences are still English only.
  - **PDF character set.** The PDF uses the built-in Helvetica/WinAnsi fonts, so Arabic (and
    any non-Western-European) text is replaced with "?". The UI says so and gives a count, and
    the JSON dossier stays lossless. With an Arabic UI, PDF labels are English. Embedding an
    Arabic-capable font with shaping is a follow-up.
  - **AI scope.** AI only suggests requirement lines. There is no AI claim extraction and no
    AI match suggestions yet. Cloud providers are not implemented (they would need provider
    accounts, which is blocked).
  - **No real model run.** The AI path was e2e-tested against a Playwright-mocked
    `localhost:11434`, not a real Ollama.
  - **No CSP header yet.** Egress is enforced in code, not by browser policy.
- **Security notes:** see `SECURITY.md` → "Phase 3". Nothing leaves the device without
  opt-in, per-request preview and Send. Model output is untrusted, bounded and deterministically
  re-classified. Consent and the egress log are device-local and never part of backups.
- **Next concrete step:** CSP `connect-src` tied to the consented origin; translate Evidence
  Vault and matcher rationales; an embedded Unicode font with Arabic shaping for the PDF;
  optional AI claim/match suggestions using the same egress boundary.
- **Founder approval required:** none (no cloud provider, no keys, nothing deployed).
