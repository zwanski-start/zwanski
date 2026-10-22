# SECURITY

Threat model, privacy posture, and unresolved risks (directive §6, §11). Truth-based: this file
describes what is **actually** implemented in the current phase, not aspirations.

## Posture (Phase 0)
- **Local-first, private by default.** The web app is a static front end rendering synthetic fixtures.
  There is **no** backend, no database server, no network egress, no account, and no API key in the core
  demo. It runs fully offline.
- **No telemetry / analytics.** None is wired in. Product metrics (directive §1.1) will be opt-in and local.

## Assets to protect (as the product grows)
Potentially sensitive user documents (PDFs, repo exports, certificates), the provenance graph, and any
future dossiers / share links. None of these contain real data yet — fixtures are synthetic.

## Trust boundaries
- **Imported documents & pasted opportunity text = hostile untrusted input.** Pasted job text is parsed as
  **data, never as instructions** for any tool or agent (prompt-injection defense, directive §6, §10.7).
  Enforced by test today only conceptually; the real parser + sanitizer lands in Phase 1/2 with tests §10.7–8.
- **Browser extension (Phase 2):** least-privilege `activeTab`, explicit user gesture, preview-before-save,
  message-origin validation, no passive capture. Not implemented yet.

## Implemented guardrails (Phase 0)
- Deterministic matching only — no LLM, no network. AI-suggested relations are ignored by the engine
  unless a human `accepted` them (`packages/core/src/match.ts`), so a suggestion can never silently become a
  verified fact (§5, §10.4/§10.6). Covered by unit test.
- `enable-pre-post-scripts=false` (ADR-0007) blocks dependency install scripts by default.
- Fixtures contain **no** real identity, legal/immigration status, secret, or credential; a unit test scans
  for credential-shaped tokens (§10.16).
- Integrity model documented: a SHA-256 digest proves byte identity, **never** authenticity or institutional
  validation. Enforced in the type model (`verification` is separate from any hash).

## Known gaps / unresolved risks (honest)
- No HTML/DOM sanitization, CSP, ZIP/PDF hardening, or size/decompression bounds yet — required before any
  real import path ships (Phase 1/2, tests §10.8).
- No local persistence yet, so no at-rest protection to reason about yet.
- No authn/z, no multi-tenant isolation (no server exists). Cloud/sync (Phase 4) is gated on a real threat
  model before it is built.
- Do **not** describe this as audited, zero-knowledge, end-to-end-encrypted, SOC 2, or production-ready.
  None of those claims are true and the directive forbids making them (§6).

## Reporting
Pre-release, internal only. A disclosure policy will be added before any public deployment.
