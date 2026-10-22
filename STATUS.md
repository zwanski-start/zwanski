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
