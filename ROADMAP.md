# ROADMAP

Delivered vs planned are tracked separately. Nothing below is "delivered" yet.

## Planned (from directive §9)
- **Phase 0** — discovery + architecture; repo, ADRs, threat model, typed schemas, nav skeleton,
  synthetic fixtures. Gate: boots locally, no API key, renders fixture data.
- **Phase 1** — end-to-end vertical slice: Evidence Vault, deterministic requirement parser +
  matching engine, interactive Proof Graph, Opportunity Lab, Bridge Plan, selective Dossier export.
  Gate: deterministic e2e tests for every §3 demo transition; reload + offline persistence.
- **Phase 2** — MV3 capture extension + trust boundaries. Gate: no passive capture; hostile
  content inert; e2e browser tests pass.
- **Phase 3** — optional provider intelligence (degrades to deterministic); EN/FR/AR + RTL; PDF.
  Gate: consent/egress tests, localization smoke tests.
- **Phase 4** — readiness + optional encrypted sync/public share with expiry/revocation.
  Gate: documented release checklist, build artifacts, known limitations listed.

## Delivered
- **Phase 0 gate met (2026-10-22).** pnpm monorepo boots locally with no API key and renders real
  synthetic fixture data across six screens.
  - `packages/core` — Zod domain schemas (§5 demo subset), deterministic requirement matcher, graph projection.
  - `packages/fixtures` — the §3 synthetic hero dataset (DEMO/SYNTHETIC, no real identity/secret).
  - `apps/web` — Next.js App Router: Compass, Evidence Vault, Opportunity Lab, Proof Graph (list view),
    Bridge Plan, Share Studio. Static prerender, offline.
  - Docs: ARCHITECTURE, SECURITY (threat model), DECISIONS (7 ADRs), docs/DATA_MODEL, QUICKSTART.
  - Tests: 14 passing (deterministic matcher + exact §3 demo states + §10.5/§10.6 + fixture secret scan).
  - `pnpm typecheck`, `pnpm test`, `pnpm build` all green.
- _Not yet delivered within Phase 0:_ local persistence (IndexedDB/Dexie), real import pipeline,
  interactive graph canvas, ADRs for competitor analysis — these are Phase 1 scope.
