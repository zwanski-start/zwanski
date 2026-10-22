# ROADMAP

Delivered vs planned are tracked separately.

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
- **Phase 0 (partial, issue #3):** pnpm monorepo, typed schemas, Dexie storage with versioned
  schema, DEMO / SYNTHETIC fixture, nav skeleton rendering fixture data with no API key.
  Gate met for "boots locally, no API key, renders fixture data"; threat model and competitor
  review are still open.
