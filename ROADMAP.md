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
- **Phase 1 (partial, issue #4):** Evidence Vault (create/import, inspector with provenance,
  dates, coverage, redaction, change history), deterministic requirement parser + matching
  engine with human oversight, schema v2 migration, app-shell service worker, JSON dossier
  export, vault backup/restore, Playwright e2e of every §3 transition + reload/offline + restore.
  Not yet: interactive 2D Proof Graph, Bridge Plan editing, Dossier/DossierItem entities.
- **Phase 2 (issue #5):** Chromium MV3 capture extension (WXT) with `activeTab` + `scripting` +
  `storage` only, click → preview → confirm, pull-based handoff to the local app's Capture Inbox
  (exact-origin check), file fallback, manifest audit in the build, extension threat model in
  `SECURITY.md`, real-browser e2e (no passive capture, hostile pages inert, capture → import).
  Not yet: Web Store packaging, Firefox, `CaptureEvent`/`ConsentGrant` entities.
- **Phase 3 (partial, issue #6):** optional, consent-gated local-AI requirement suggestions
  that degrade to the deterministic parser (consent/egress unit + e2e tests); EN/FR/AR UI
  with RTL and localized dates (localization smoke tests); source-linked PDF dossier export.
  Not yet: full translation of the Evidence Vault and matcher rationales, Arabic glyphs in the
  PDF, AI claim/match suggestions, cloud providers (blocked), and a CSP.

- **Phase 4 (partial, issue #7):** opt-in online share links (client-side AES-GCM encrypted
  dossier, key only in the link fragment) via a self-hostable zero-dependency share service with
  server-enforced expiry (5 min – 30 days) and revocation, owner-scoped tenant isolation, CORS
  allowlist, rate limits and a CSP-locked read-only viewer; passphrase-encrypted vault backups
  (AES-256-GCM + PBKDF2); automated accessibility (axe WCAG 2.1 A/AA light+dark, keyboard,
  accessibility-tree graph inspection) and performance budgets; `pnpm release` artifacts
  (static Pages-compatible export with security headers, extension zip, share-server bundle,
  checksums); `docs/RELEASE_CHECKLIST.md`, `docs/RUNBOOK.md`, `docs/DEPLOYMENT.md`, threat-model
  refresh. **Not delivered:** multi-device sync (Supabase/RLS — needs a provider account and
  approval), any live deployment, Workers/KV storage adapter for the share service, Chrome Web
  Store packaging, password-protected or per-reader shares.
