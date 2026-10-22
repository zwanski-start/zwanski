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

## 2026-10-22 — Phase 0 vertical scaffold (gate met)
- **What works:** pnpm monorepo boots locally with **no API key** and renders real synthetic
  fixture data. `apps/web` (Next.js 15/React 19) serves six screens (Compass, Evidence Vault,
  Opportunity Lab, Proof Graph list view, Bridge Plan, Share Studio), all driven by
  `packages/core` (Zod schemas + deterministic matcher + graph projection) and
  `packages/fixtures` (synthetic §3 dataset). `pnpm typecheck`, `pnpm test`, `pnpm build` green.
- **Tests:** 14 passing (6 core matcher-logic + 8 fixtures). Assert the exact hero states —
  TS/PostgreSQL Supported, Deployment Uncertain, two case studies Not-yet, Language Unknown —
  plus §10.5 (deleting a claim drops Supported), §10.6 (user-stated never auto-Supported),
  unreviewed AI suggestion ignored, and a fixture credential-token scan (§10.16).
- **Runtime check:** all 6 routes HTTP 200 under `next start`; `/opportunities` renders the
  deterministic states. Build prerenders all 9 routes as static (offline).
- **What does NOT work yet:** no local persistence (IndexedDB/Dexie), no real file/PDF/ZIP import,
  no HTML sanitization/CSP, no interactive graph canvas, no extension, no AI adapters, no i18n.
  Reload-persistence and the full §10 e2e suite are Phase 1.
- **Security risks:** import-hardening and sanitization not built yet — no real untrusted input
  path exists today (fixtures only). Must land before any import ships. See SECURITY.md.
- **Deviations (logged):** ADR-0003 bespoke CSS vs Tailwind; ADR-0004 graph-as-list before React Flow.
- **Next concrete step:** Phase 1 vertical slice — add `packages/storage` (IndexedDB/Dexie + migrations)
  and `packages/evidence` (real import + SHA-256), make the Vault/Opportunity flow mutate persisted
  state, add the interactive graph canvas, and write the Playwright e2e for every §3 transition
  (reload + offline mandatory).
- **Founder approval required:** none. Delivered on branch `phase-0/monorepo-scaffold` as a PR per
  the repo safety rail (never push to main / never self-merge); review + merge when ready.
